'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, getDocs, doc, getDoc, writeBatch, where, onSnapshot } from 'firebase/firestore';
import { db, getSharedGroup } from '../lib/firebase';
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
    const loadRestRef = useRef(false);
    const startRestRef = useRef(null);
    // True once `runsheets` reflects a live Firestore snapshot (not just the localStorage cache).
    const [runsheetsLoaded, setRunsheetsLoaded] = useState(false);

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
    const runMigration = useCallback(async (force = false) => {
        if (!user?.email || hasMigratedRef.current) return;
        hasMigratedRef.current = true;
        // Once a check has come back clean, don't pay for it on every page load.
        const migrationFlagKey = `migrationChecked_${userHash}`;
        if (!force && typeof window !== 'undefined' && localStorage.getItem(migrationFlagKey)) {
            return;
        }
        const markChecked = () => {
            try { localStorage.setItem(migrationFlagKey, '1'); } catch (e) {}
        };
        setMigrationState({ status: 'checking', total: 0, migrated: 0 });
        try {
            const userRunsheetsRef = collection(db, `users/${user.email}/runsheets`);
            const userSnap = await getDocs(query(userRunsheetsRef));
            const allRsIds = userSnap.docs.map(doc => doc.id);

            if (allRsIds.length === 0) {
                setMigrationState({ status: 'none', total: 0, migrated: 0 });
                markChecked();
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

                            // No members on record: can't be migrated safely (claiming ownership
                            // from a personal ref would let anyone take over a runsheet).
                            if (memberEmails.length === 0) return;

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
                // Not marked as checked: unmigratable leftovers get one more look next load.
            } else {
                setMigrationState({ status: 'none', total: 0, migrated: 0 });
                markChecked();
            }
        } catch (e) {
            console.error("Migration error:", e);
            setMigrationState({ status: 'none', total: 0, migrated: 0 });
        }
    }, [user, userHash]);

    // ── Lightweight group enrollment: runs only once per group per session ──
    const enrollInGroup = useCallback(async (groupId) => {
        if (!userHash || !groupId) return;
        if (enrolledGroupsRef.current.has(groupId)) return; // Already enrolled this session

        // Verify authorization: is creator, has token in sessionStorage, or already joined in localStorage
        const groupObj = groups.find(g => g.id === groupId);
        const isCreator = groupObj && groupObj.createdBy === user?.email;
        
        let hasToken = false;
        if (typeof window !== 'undefined') {
            hasToken = !!(sessionStorage.getItem(`groupToken_${groupId}`) || localStorage.getItem(`groupToken_${groupId}`));
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
            // Server validates the token (or group ownership) and enrolls us in the group's runsheets.
            const token = (typeof window !== 'undefined')
                ? (sessionStorage.getItem(`groupToken_${groupId}`) || localStorage.getItem(`groupToken_${groupId}`))
                : null;
            const res = await getSharedGroup(groupId, token);
            if (res?.newlyEnrolled > 0) {
                setShowGroupToast(true);
            }
        } catch (err) {
            if (err?.code !== 'functions/permission-denied') {
                console.error('Error enrolling in group:', err);
            }
        }
    }, [user, userHash, groups]);

    // Loads past/archived runsheets too (group views, Past/Archive tabs, search).
    const loadAllRunsheets = useCallback(() => {
        loadRestRef.current = true;
        if (startRestRef.current) startRestRef.current();
    }, []);

    // Set up Realtime Listeners on startup & when user changes.
    // Only upcoming runsheets are listened to by default; the rest are fetched on demand.
    useEffect(() => {
        if (!userHash) {
            setRunsheets([]);
            setGroups([]);
            setRunsheetsLoaded(false);
            loadRestRef.current = false;
            enrolledGroupsRef.current.clear();
            return;
        }

        setRunsheetsLoaded(false);
        const cacheKey = `runsheetsCache_${userHash}`;
        const groupsCacheKey = `groupsCache_${userHash}`;
        // One day of slack so ISO/timezone-suffixed dates near midnight never fall in the wrong bucket.
        const boundary = moment().subtract(1, 'day').format('YYYY-MM-DD');

        let active = true;
        let upcomingDocs = null;   // null = not loaded yet
        let restDocs = null;
        let cachedRest = [];       // older runsheets from the last session, shown until `rest` loads
        let cachedGroupIds = [];
        let lastGroupKey = null;
        const unsubs = [];

        // 1. Initial Load from LocalStorage
        try {
            const cachedData = JSON.parse(localStorage.getItem(cacheKey) || '[]');
            if (Array.isArray(cachedData) && cachedData.length > 0) {
                const stale = cachedData.map(r => ({ ...r, _stale: true }));
                setRunsheets(stale);
                cachedRest = stale.filter(r => !(typeof r.date === 'string' && r.date >= boundary));
            }
        } catch (e) {}

        try {
            const cachedGroups = JSON.parse(localStorage.getItem(groupsCacheKey) || '[]');
            if (Array.isArray(cachedGroups)) {
                setGroups(cachedGroups);
                cachedGroupIds = cachedGroups.map(g => g.id);
            }
        } catch (e) {}

        setIsSyncing(true);

        const toRunsheet = (d) => {
            const data = d.data();
            const role = data.roles?.[user.email] || null;
            return {
                id: d.id,
                ...data,
                category: data.category || 'active',
                role: role,
                isEditor: role === 'editor' || role === 'owner'
            };
        };

        const fetchGroups = async (merged) => {
            const groupIds = [...new Set(merged.map(r => r.groupId).filter(Boolean))];
            let joinedGroupIds = [];
            try {
                joinedGroupIds = JSON.parse(localStorage.getItem(`joinedGroups_${userHash}`) || '[]');
            } catch (e) {}
            // Until older runsheets are loaded, keep groups we knew about last session.
            const known = restDocs === null ? cachedGroupIds : [];
            const combinedGroupIds = [...new Set([...groupIds, ...joinedGroupIds, ...known])].sort();

            // Only hit Firestore when the set of groups actually changed.
            const key = combinedGroupIds.join('|');
            if (key === lastGroupKey) return;
            lastGroupKey = key;

            try {
                const ownedSnap = await getDocs(query(collection(db, 'groups'), where('createdBy', '==', user.email)));
                const ownedGroups = ownedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const ownedGroupIds = new Set(ownedGroups.map(g => g.id));
                const remainingGroupIds = combinedGroupIds.filter(id => !ownedGroupIds.has(id));

                let allGroups = [...ownedGroups];
                if (remainingGroupIds.length > 0) {
                    // One get per group: rules only allow listing groups you created.
                    const snaps = await Promise.all(
                        remainingGroupIds.map(id => getDoc(doc(db, 'groups', id)).catch(() => null))
                    );
                    allGroups = [...allGroups, ...snaps
                        .filter(snap => snap && snap.exists())
                        .map(snap => ({ id: snap.id, ...snap.data() }))];
                }
                if (!active) return;
                setGroups(allGroups);
                try { localStorage.setItem(groupsCacheKey, JSON.stringify(allGroups)); } catch (e) {}
            } catch (e) {
                lastGroupKey = null; // retry on the next snapshot
                console.error("Error fetching groups:", e);
            }
        };

        const publish = () => {
            if (!active || upcomingDocs === null) return;
            const liveIds = new Set(upcomingDocs.map(r => r.id));
            const rest = (restDocs !== null ? restDocs : cachedRest).filter(r => !liveIds.has(r.id));
            const merged = [...upcomingDocs, ...rest];

            merged.sort((a, b) => {
                const diff = new Date(a.date) - new Date(b.date);
                if (diff === 0) return (a.time || "").localeCompare(b.time || "");
                return diff;
            });

            setRunsheets(merged);
            setRunsheetsLoaded(true);
            setIsSyncing(false);

            // Cache list fields only: notes can hold inline images and blow the 5MB quota.
            try {
                localStorage.setItem(cacheKey, JSON.stringify(merged.map(({ notes, _stale, ...r }) => r)));
            } catch (e) {
                try { localStorage.removeItem(cacheKey); } catch (e2) {}
            }

            fetchGroups(merged);
        };

        const base = [collection(db, 'runsheets'), where('memberEmails', 'array-contains', user.email)];

        // Fallback: one listener for everything (used if the composite index isn't deployed yet).
        const subscribeAll = () => {
            unsubs.push(onSnapshot(query(...base), (snapshot) => {
                upcomingDocs = snapshot.docs.map(toRunsheet);
                restDocs = [];
                publish();
            }, (error) => {
                console.error("Runsheets listener error:", error);
                setIsSyncing(false);
            }));
        };

        let fellBack = false;
        const onIndexMissing = (error) => {
            if (error?.code === 'failed-precondition' && !fellBack) {
                fellBack = true;
                console.warn('Runsheet date index missing; loading all runsheets in one listener.');
                unsubs.splice(0).forEach(u => u());
                subscribeAll();
                return true;
            }
            return false;
        };

        // 2. Upcoming runsheets (always)
        unsubs.push(onSnapshot(query(...base, where('date', '>=', boundary)), (snapshot) => {
            if (fellBack) return;
            upcomingDocs = snapshot.docs.map(toRunsheet);
            publish();
        }, (error) => {
            if (onIndexMissing(error)) return;
            console.error("Runsheets listener error:", error);
            setIsSyncing(false);
        }));

        // 3. Everything older (only once something asks for it)
        let restStarted = false;
        const startRest = () => {
            if (restStarted || fellBack || !active) return;
            restStarted = true;
            unsubs.push(onSnapshot(query(...base, where('date', '<', boundary)), (snapshot) => {
                if (fellBack) return;
                restDocs = snapshot.docs.map(toRunsheet);
                publish();
            }, (error) => {
                if (onIndexMissing(error)) return;
                console.error("Past runsheets listener error:", error);
            }));
        };
        startRestRef.current = startRest;
        if (loadRestRef.current) startRest();

        // 4. Background self-healing migration
        runMigration();

        return () => {
            active = false;
            startRestRef.current = null;
            unsubs.forEach(u => u());
        };
    }, [user, userHash, runMigration]);

    const refresh = useCallback(() => {
        // Realtime listener handles updates, but we re-run migration as a sanity check
        hasMigratedRef.current = false;
        runMigration(true);
    }, [runMigration]);

    return (
        <DashboardContext.Provider value={{
            runsheets, setRunsheets,
            runsheetsLoaded, loadAllRunsheets,
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
