'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, getDocs, doc, getDoc, writeBatch, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import moment from 'moment';

const DashboardContext = createContext({});

export const useDashboard = () => useContext(DashboardContext);

export const DashboardContextProvider = ({ children }) => {
    const { user, userHash } = useAuth();
    const [runsheets, setRunsheets] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('upcoming');
    const [migrationState, setMigrationState] = useState({ status: 'idle', total: 0, migrated: 0 });
    const [showGroupToast, setShowGroupToast] = useState(false);
    const enrolledGroupsRef = useRef(new Set());
    const hasMigratedRef = useRef(false);

    // Persist activeFilter to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (userHash) {
                localStorage.setItem(`dashboard_filter_${userHash}`, activeFilter);
            } else {
                localStorage.setItem('dashboard_filter', activeFilter);
            }
        }
    }, [activeFilter, userHash]);

    useEffect(() => {
        if (showGroupToast) {
            const timer = setTimeout(() => {
                setShowGroupToast(false);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [showGroupToast]);



    // ── Self-Healing Migration function: run in background to convert legacy runsheets ──
    const runMigration = useCallback(async () => {
        if (!user?.email || hasMigratedRef.current) return;
        hasMigratedRef.current = true;
        setMigrationState({ status: 'checking', total: 0, migrated: 0 });
        try {
            const userRunsheetsRef = collection(db, `users/${user.email}/runsheets`);
            const userSnap = await getDocs(query(userRunsheetsRef));
            const allRsIds = userSnap.docs.map(doc => doc.id);

            if (allRsIds.length === 0) {
                setMigrationState({ status: 'none', total: 0, migrated: 0 });
                return;
            }

            // Query for migrated ones to compare
            const q = query(
                collection(db, 'runsheets'),
                where('memberEmails', 'array-contains', user.email)
            );
            const snap = await getDocs(q);
            const migratedIds = new Set(snap.docs.map(doc => doc.id));

            const legacyIds = allRsIds.filter(id => !migratedIds.has(id));

            if (legacyIds.length > 0) {
                setMigrationState({ status: 'migrating', total: legacyIds.length, migrated: 0 });
                console.log(`Found ${legacyIds.length} legacy runsheets. Migrating...`);
                
                let currentMigrated = 0;
                // Migrate them in chunks of 10 to avoid database write rate limits
                for (let i = 0; i < legacyIds.length; i += 10) {
                    const chunk = legacyIds.slice(i, i + 10);
                    const batch = writeBatch(db);
                    let hasUpdates = false;

                    await Promise.all(chunk.map(async (rsId) => {
                        try {
                            const runsheetRef = doc(db, 'runsheets', rsId);
                            const runsheetSnap = await getDoc(runsheetRef);

                            if (!runsheetSnap.exists()) {
                                // Clean up orphaned reference in user's list
                                const userRsRef = doc(db, `users/${user.email}/runsheets`, rsId);
                                batch.delete(userRsRef);
                                hasUpdates = true;
                                currentMigrated++;
                                setMigrationState(prev => ({ ...prev, migrated: Math.min(prev.total, currentMigrated) }));
                                return;
                            }

                            // Fetch users and roles from subcollection
                            const usersSnap = await getDocs(collection(db, `runsheets/${rsId}/users`));
                            const memberEmails = [];
                            const roles = {};

                            usersSnap.docs.forEach(userDoc => {
                                const email = userDoc.id.trim().toLowerCase();
                                const role = userDoc.data().role || 'viewer';
                                memberEmails.push(email);
                                roles[email] = role;
                            });

                            // Fallback: if users subcollection is empty, default current user as owner
                            if (memberEmails.length === 0) {
                                memberEmails.push(user.email);
                                roles[user.email] = 'owner';
                                const subUserRef = doc(db, `runsheets/${rsId}/users`, user.email);
                                batch.set(subUserRef, { id: user.email, email: user.email, role: 'owner' });
                            }

                            batch.update(runsheetRef, {
                                memberEmails,
                                roles
                            });
                            hasUpdates = true;
                            currentMigrated++;
                            setMigrationState(prev => ({ ...prev, migrated: Math.min(prev.total, currentMigrated) }));
                        } catch (e) {
                            console.error(`Error migrating runsheet ${rsId}:`, e);
                        }
                    }));

                    if (hasUpdates) {
                        await batch.commit();
                    }
                }
                console.log("Migration completed.");
                setMigrationState({ status: 'completed', total: legacyIds.length, migrated: legacyIds.length });
            } else {
                setMigrationState({ status: 'none', total: 0, migrated: 0 });
            }
        } catch (e) {
            console.error("Migration error:", e);
            setMigrationState({ status: 'none', total: 0, migrated: 0 });
        }
    }, [user]);

    // ── Lightweight group enrollment: runs only once per group per session ──
    const enrollInGroup = useCallback(async (groupId) => {
        if (!userHash || !groupId) return;
        if (enrolledGroupsRef.current.has(groupId)) return; // Already enrolled this session

        // Verify authorization: is creator, has token in sessionStorage, or already joined in localStorage
        const groupObj = groups.find(g => g.id === groupId);
        const isCreator = groupObj && groupObj.createdBy === user?.email;
        
        let hasToken = false;
        if (typeof window !== 'undefined') {
            hasToken = !!sessionStorage.getItem(`groupToken_${groupId}`);
        }
        
        let isAlreadyJoined = false;
        if (typeof window !== 'undefined') {
            const joinedKey = `joinedGroups_${userHash}`;
            try {
                const joined = JSON.parse(localStorage.getItem(joinedKey) || '[]');
                isAlreadyJoined = joined.includes(groupId);
            } catch (e) {}
        }

        if (!isCreator && !hasToken && !isAlreadyJoined) {
            // Not authorized to auto-enroll in all runsheets of this group. Skip!
            return;
        }

        enrolledGroupsRef.current.add(groupId);

        // Track this group as joined in user-specific localStorage
        if (typeof window !== 'undefined') {
            const joinedKey = `joinedGroups_${userHash}`;
            try {
                const joined = JSON.parse(localStorage.getItem(joinedKey) || '[]');
                if (!joined.includes(groupId)) {
                    localStorage.setItem(joinedKey, JSON.stringify([...joined, groupId]));
                }
            } catch (e) {}
        }

        try {
            const groupRsSnap = await getDocs(query(collection(db, 'runsheets'), where('groupId', '==', groupId)));

            const batch = writeBatch(db);
            let needsCommit = false;

            for (const rsDoc of groupRsSnap.docs) {
                const rsId = rsDoc.id;
                const rsData = rsDoc.data();
                const existingRole = rsData.roles?.[user.email] || rsData.roles?.[user.email.toLowerCase()];

                // Skip if user already has a role and is in memberEmails
                if (existingRole && rsData.memberEmails?.includes(user.email)) continue;

                // Ensure user is in memberEmails and roles on main doc
                const currentEmails = rsData.memberEmails || [];
                const updates = {};
                if (!currentEmails.includes(user.email)) {
                    updates.memberEmails = [...currentEmails, user.email];
                }
                if (!existingRole) {
                    updates[`roles.${user.email}`] = 'viewer';
                }
                if (Object.keys(updates).length > 0) {
                    batch.update(doc(db, 'runsheets', rsId), updates);
                }

                // Ensure subcollection user doc exists
                batch.set(doc(db, `runsheets/${rsId}/users`, user.email), {
                    id: user.email, email: user.email, role: existingRole || 'viewer'
                }, { merge: true });

                // Ensure personal reference exists
                batch.set(doc(db, `users/${user.email}/runsheets`, rsId), { id: rsId }, { merge: true });

                needsCommit = true;
            }

            if (needsCommit) {
                await batch.commit();
                setShowGroupToast(true);
            }
        } catch (err) {
            console.error('Error enrolling in group:', err);
        }
    }, [user, userHash, groups]);

    // Set up Realtime Listener on startup & when user changes
    useEffect(() => {
        if (!userHash) {
            setRunsheets([]);
            setGroups([]);
            enrolledGroupsRef.current.clear();
            return;
        }

        const cacheKey = `runsheetsCache_${userHash}`;
        const groupsCacheKey = `groupsCache_${userHash}`;

        // 1. Initial Load from LocalStorage
        const cachedStr = localStorage.getItem(cacheKey);
        const cachedGroupsStr = localStorage.getItem(groupsCacheKey);

        if (cachedStr) {
            try {
                const cachedData = JSON.parse(cachedStr);
                if (Array.isArray(cachedData) && cachedData.length > 0) {
                    setRunsheets(cachedData);
                }
            } catch (e) {}
        }

        if (cachedGroupsStr) {
            try {
                const cachedGroups = JSON.parse(cachedGroupsStr);
                if (Array.isArray(cachedGroups)) {
                    setGroups(cachedGroups);
                }
            } catch (e) {}
        }

        setIsSyncing(true);

        // 2. Setup Realtime Listener
        const q = query(
            collection(db, 'runsheets'),
            where('memberEmails', 'array-contains', user.email)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const fetchedRunsheets = snapshot.docs.map(doc => {
                const data = doc.data();
                const role = data.roles?.[user.email] || null;
                return {
                    id: doc.id,
                    ...data,
                    category: data.category || 'active',
                    role: role,
                    isEditor: role === 'editor' || role === 'owner'
                };
            });

            fetchedRunsheets.sort((a, b) => {
                const diff = new Date(a.date) - new Date(b.date);
                if (diff === 0) {
                    const timeA = a.time || "";
                    const timeB = b.time || "";
                    return timeA.localeCompare(timeB);
                }
                return diff;
            });

            setRunsheets(fetchedRunsheets);
            localStorage.setItem(cacheKey, JSON.stringify(fetchedRunsheets));

            // Fetch referenced groups and user-owned groups
            try {
                // 1. Fetch groups created/owned by this user
                const ownedQuery = query(collection(db, 'groups'), where('createdBy', '==', user.email));
                const ownedSnap = await getDocs(ownedQuery);
                const ownedGroups = ownedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // 2. Identify referenced groups that we don't own
                const groupIds = [...new Set(fetchedRunsheets.map(r => r.groupId).filter(Boolean))];

                // Add groups joined via token/link (from localStorage)
                let joinedGroupIds = [];
                if (typeof window !== 'undefined') {
                    try {
                        joinedGroupIds = JSON.parse(localStorage.getItem(`joinedGroups_${userHash}`) || '[]');
                    } catch (e) {}
                }

                // Combine owned and joined group IDs (exclude groups we only reference because of a shared runsheet)
                const combinedGroupIds = [...new Set([...ownedGroups.map(g => g.id), ...joinedGroupIds])];
                const ownedGroupIds = new Set(ownedGroups.map(g => g.id));
                const remainingGroupIds = combinedGroupIds.filter(id => !ownedGroupIds.has(id));

                let allGroups = [...ownedGroups];

                if (remainingGroupIds.length > 0) {
                    const chunks = [];
                    for (let i = 0; i < remainingGroupIds.length; i += 30) {
                        chunks.push(remainingGroupIds.slice(i, i + 30));
                    }
                    const snaps = await Promise.all(
                        chunks.map(chunk =>
                            getDocs(query(collection(db, 'groups'), where('__name__', 'in', chunk)))
                        )
                    );
                    const otherGroups = snaps.flatMap(snap =>
                        snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    );
                    allGroups = [...allGroups, ...otherGroups];
                }

                setGroups(allGroups);
                localStorage.setItem(groupsCacheKey, JSON.stringify(allGroups));
            } catch (e) {
                console.error("Error fetching groups:", e);
            }

            setIsSyncing(false);
        }, (error) => {
            console.error("Runsheets listener error:", error);
            setIsSyncing(false);
        });

        // 3. Background self-healing migration
        runMigration();

        return () => unsubscribe();
    }, [user, userHash, runMigration]);

    const refresh = useCallback(() => {
        // Realtime listener handles updates, but we re-run migration as a sanity check
        runMigration();
    }, [runMigration]);

    return (
        <DashboardContext.Provider value={{
            runsheets, setRunsheets,
            groups, setGroups,
            isSyncing, setIsSyncing,
            activeFilter, setActiveFilter,
            refresh,
            enrollInGroup,
            migrationState, setMigrationState,
            showGroupToast, setShowGroupToast
        }}>
            {children}
        </DashboardContext.Provider>
    );
};
