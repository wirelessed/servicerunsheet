'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, getDocs, doc, getDoc, writeBatch, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import moment from 'moment';

const DashboardContext = createContext({});

export const useDashboard = () => useContext(DashboardContext);

export const DashboardContextProvider = ({ children }) => {
    const { user } = useAuth();
    const [runsheets, setRunsheets] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('upcoming');
    const enrolledGroupsRef = useRef(new Set());

    // ── Main data fetch: runs ONCE per user session, not on filter change ──
    const fetchRunsheets = useCallback(async (isInitialLoad = false) => {
        if (!user || !user.email) return;

        const cacheKey = `runsheetsCache_${user.email}`;
        const groupsCacheKey = `groupsCache_${user.email}`;

        if (isInitialLoad) {
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
        }

        setIsSyncing(true);

        try {
            const userRunsheetsRef = collection(db, `users/${user.email}/runsheets`);
            const userSnap = await getDocs(query(userRunsheetsRef));
            const userRsIds = new Set(userSnap.docs.map(doc => doc.id));

            const withRoles = (await Promise.all(
                Array.from(userRsIds).map(async (rsId) => {
                    try {
                        const [runsheetSnap, userRoleSnap] = await Promise.all([
                            getDoc(doc(db, 'runsheets', rsId)),
                            getDoc(doc(db, `runsheets/${rsId}/users`, user.email)),
                        ]);
                        if (!runsheetSnap.exists()) return null;
                        const data = runsheetSnap.data();
                        const role = userRoleSnap.exists() ? userRoleSnap.data().role : null;
                        return { id: runsheetSnap.id, ...data, category: data.category || 'active', role: role, isEditor: role === 'editor' || role === 'owner' };
                    } catch (e) { return null; }
                })
            )).filter(Boolean);

            const uniqueGroupIds = [...new Set(withRoles.map(r => r.groupId).filter(Boolean))];
            const groupData = await Promise.all(uniqueGroupIds.map(async (gid) => {
                const groupSnap = await getDoc(doc(db, 'groups', gid));
                return groupSnap.exists() ? { id: gid, ...groupSnap.data() } : null;
            }));
            const validGroups = groupData.filter(Boolean);

            setGroups(validGroups);
            withRoles.sort((a, b) => {
                const diff = new Date(a.date) - new Date(b.date);
                if (diff === 0) {
                    const timeA = a.time || "";
                    const timeB = b.time || "";
                    return timeA.localeCompare(timeB);
                }
                return diff;
            });
            setRunsheets(withRoles);

            localStorage.setItem(cacheKey, JSON.stringify(withRoles));
            localStorage.setItem(`groupsCache_${user.email}`, JSON.stringify(validGroups));
        } catch (error) {
            console.error('Context fetch error:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [user]);

    // ── Lightweight group enrollment: runs only once per group per session ──
    const enrollInGroup = useCallback(async (groupId) => {
        if (!user?.email || !groupId) return;
        if (enrolledGroupsRef.current.has(groupId)) return; // Already enrolled this session
        enrolledGroupsRef.current.add(groupId);

        try {
            const userRunsheetsRef = collection(db, `users/${user.email}/runsheets`);
            const userSnap = await getDocs(query(userRunsheetsRef));
            const userRsIds = new Set(userSnap.docs.map(d => d.id));

            const groupRsQuery = query(collection(db, 'runsheets'), where('groupId', '==', groupId));
            const groupRsSnap = await getDocs(groupRsQuery);

            const batch = writeBatch(db);
            let needsCommit = false;
            const newRunsheets = [];

            for (const rsDoc of groupRsSnap.docs) {
                if (!userRsIds.has(rsDoc.id)) {
                    const rsId = rsDoc.id;
                    batch.set(doc(db, `runsheets/${rsId}/users`, user.email), { id: user.email, email: user.email, role: 'viewer' });
                    batch.set(doc(db, `users/${user.email}/runsheets`, rsId), { id: rsId });
                    needsCommit = true;

                    const data = rsDoc.data();
                    newRunsheets.push({
                        id: rsDoc.id, ...data,
                        category: data.category || 'active',
                        isEditor: false
                    });
                }
            }

            if (needsCommit) {
                await batch.commit();
                // Append new runsheets to state without a full refetch
                setRunsheets(prev => {
                    const existingIds = new Set(prev.map(r => r.id));
                    const toAdd = newRunsheets.filter(r => !existingIds.has(r.id));
                    if (toAdd.length === 0) return prev;
                    const merged = [...prev, ...toAdd];
                    merged.sort((a, b) => {
                        const diff = new Date(a.date) - new Date(b.date);
                        if (diff === 0) return (a.time || "").localeCompare(b.time || "");
                        return diff;
                    });
                    // Update localStorage cache too
                    const cacheKey = `runsheetsCache_${user.email}`;
                    localStorage.setItem(cacheKey, JSON.stringify(merged));
                    return merged;
                });

                // Check if the group itself is new and needs to be added to groups list
                setGroups(prev => {
                    if (prev.some(g => g.id === groupId)) return prev;
                    const groupSnap = groupRsSnap.docs[0]?.data();
                    // We'll fetch the group name properly
                    return prev; // Will be picked up on next full refresh
                });
            }
        } catch (err) {
            console.error('Error enrolling in group:', err);
        }
    }, [user]);

    // Initial fetch — only when user changes, NOT when filter changes
    useEffect(() => {
        if (user?.email) {
            fetchRunsheets(true);
        } else {
            setRunsheets([]);
            setGroups([]);
            enrolledGroupsRef.current.clear();
        }
    }, [user, fetchRunsheets]);

    return (
        <DashboardContext.Provider value={{
            runsheets, setRunsheets,
            groups, setGroups,
            isSyncing, setIsSyncing,
            activeFilter, setActiveFilter,
            refresh: fetchRunsheets,
            enrollInGroup
        }}>
            {children}
        </DashboardContext.Provider>
    );
};
