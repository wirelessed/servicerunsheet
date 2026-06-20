'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, getDocs, doc, getDoc, writeBatch, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import moment from 'moment';
import { usePathname } from 'next/navigation';

const DashboardContext = createContext({});

export const useDashboard = () => useContext(DashboardContext);

export const DashboardContextProvider = ({ children }) => {
    const { user } = useAuth();
    const pathname = usePathname();
    const [runsheets, setRunsheets] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('upcoming');
    const [migrationState, setMigrationState] = useState({ status: 'idle', total: 0, migrated: 0 });
    const enrolledGroupsRef = useRef(new Set());
    const hasMigratedRef = useRef(false);

    // Persist activeFilter to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (user?.email) {
                localStorage.setItem(`dashboard_filter_${user.email}`, activeFilter);
            } else {
                localStorage.setItem('dashboard_filter', activeFilter);
            }
        }
    }, [activeFilter, user]);

    // Load activeFilter based on user context and consume generic temp filter if present
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const tempFilter = localStorage.getItem('dashboard_filter');

        if (user?.email) {
            const userFilterKey = `dashboard_filter_${user.email}`;
            const savedFilter = localStorage.getItem(userFilterKey);

            if (tempFilter) {
                setActiveFilter(tempFilter);
                localStorage.setItem(userFilterKey, tempFilter);
                localStorage.removeItem('dashboard_filter');
            } else if (savedFilter) {
                setActiveFilter(savedFilter);
            } else {
                setActiveFilter('upcoming');
            }
        } else {
            if (tempFilter) {
                setActiveFilter(tempFilter);
            } else {
                setActiveFilter('upcoming');
            }
        }
    }, [user, pathname]);

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
                                batch.set(subUserRef, { email: user.email, role: 'owner' });
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
        if (!user?.email || !groupId) return;
        if (enrolledGroupsRef.current.has(groupId)) return; // Already enrolled this session
        enrolledGroupsRef.current.add(groupId);

        // Track this group as joined in user-specific localStorage
        if (typeof window !== 'undefined') {
            const joinedKey = `joinedGroups_${user.email}`;
            try {
                const joined = JSON.parse(localStorage.getItem(joinedKey) || '[]');
                if (!joined.includes(groupId)) {
                    localStorage.setItem(joinedKey, JSON.stringify([...joined, groupId]));
                }
            } catch (e) {}
        }

        try {
            const groupRsQuery = query(collection(db, 'runsheets'), where('groupId', '==', groupId));
            const groupRsSnap = await getDocs(groupRsQuery);

            const batch = writeBatch(db);
            let needsCommit = false;
            const newRunsheets = [];

            for (const rsDoc of groupRsSnap.docs) {
                const rsId = rsDoc.id;
                const rsData = rsDoc.data();

                // Check if user already has a role in subcollection OR in the main doc's roles map
                const existingUserSnap = await getDoc(doc(db, `runsheets/${rsId}/users`, user.email));
                const mainDocRole = rsData.roles?.[user.email];

                if (existingUserSnap.exists() || mainDocRole) {
                    // User already has a role — don't overwrite, but ensure all references match
                    const userRsRef = doc(db, `users/${user.email}/runsheets`, rsId);
                    const userRsSnap = await getDoc(userRsRef);

                    const needsPersonalRef = !userRsSnap.exists();
                    const subRole = existingUserSnap.exists() ? existingUserSnap.data().role : null;

                    const needsSubcollectionRef = mainDocRole && !existingUserSnap.exists();
                    const needsMainDocUpdate = subRole && (!mainDocRole || !rsData.memberEmails?.includes(user.email));

                    if (needsPersonalRef || needsSubcollectionRef || needsMainDocUpdate) {
                        if (needsPersonalRef) {
                            batch.set(userRsRef, { id: rsId });
                        }
                        if (needsSubcollectionRef) {
                            batch.set(doc(db, `runsheets/${rsId}/users`, user.email), {
                                id: user.email,
                                email: user.email,
                                role: mainDocRole
                            });
                        }
                        if (needsMainDocUpdate) {
                            const currentEmails = rsData.memberEmails || [];
                            const updates = {};
                            if (!currentEmails.includes(user.email)) {
                                updates.memberEmails = [...currentEmails, user.email];
                            }
                            updates[`roles.${user.email}`] = subRole;
                            batch.update(doc(db, 'runsheets', rsId), updates);
                        }
                        needsCommit = true;
                    }
                    continue;
                }

                // New user for this runsheet — enroll as viewer
                batch.set(doc(db, `runsheets/${rsId}/users`, user.email), { id: user.email, email: user.email, role: 'viewer' });
                batch.set(doc(db, `users/${user.email}/runsheets`, rsId), { id: rsId });

                // Update memberEmails and roles on the main runsheet document using standard dot notation
                const currentEmails = rsData.memberEmails || [];
                if (!currentEmails.includes(user.email)) {
                    batch.update(doc(db, 'runsheets', rsId), {
                        memberEmails: [...currentEmails, user.email],
                        [`roles.${user.email}`]: 'viewer'
                    });
                }
                needsCommit = true;

                newRunsheets.push({
                    id: rsDoc.id, ...rsData,
                    category: rsData.category || 'active',
                    role: 'viewer',
                    isEditor: false
                });
            }

            if (needsCommit) {
                await batch.commit();
                // State updates are handled automatically by onSnapshot
            }
        } catch (err) {
            console.error('Error enrolling in group:', err);
        }
    }, [user]);

    // Set up Realtime Listener on startup & when user changes
    useEffect(() => {
        if (!user?.email) {
            setRunsheets([]);
            setGroups([]);
            enrolledGroupsRef.current.clear();
            return;
        }

        const cacheKey = `runsheetsCache_${user.email}`;
        const groupsCacheKey = `groupsCache_${user.email}`;

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
                        joinedGroupIds = JSON.parse(localStorage.getItem(`joinedGroups_${user.email}`) || '[]');
                    } catch (e) {}
                }

                // Combine referenced and joined group IDs
                const combinedGroupIds = [...new Set([...groupIds, ...joinedGroupIds])];
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
    }, [user, runMigration]);

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
            migrationState, setMigrationState
        }}>
            {children}
        </DashboardContext.Provider>
    );
};
