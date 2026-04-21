'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('upcoming');

    const fetchRunsheets = useCallback(async (forcedFilter) => {
        if (!user || !user.email) return;

        const currentFilter = forcedFilter || activeFilter;
        const cacheKey = `runsheetsCache_${user.email}`;
        const groupsCacheKey = `groupsCache_${user.email}`;
        const cachedStr = localStorage.getItem(cacheKey);
        const cachedGroupsStr = localStorage.getItem(groupsCacheKey);
        let hasCache = false;

        if (cachedStr) {
            try {
                const cachedData = JSON.parse(cachedStr);
                if (Array.isArray(cachedData) && cachedData.length > 0) {
                    setRunsheets(cachedData);
                    hasCache = true;
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

        if (!hasCache) setLoading(true);
        else {
            setLoading(false);
            setIsSyncing(true);
        }

        try {
            const userRunsheetsRef = collection(db, `users/${user.email}/runsheets`);
            const userSnap = await getDocs(query(userRunsheetsRef));
            const userRsIds = new Set(userSnap.docs.map(doc => doc.id));

            // Automatic group viewer access
            const isGroupFilter = currentFilter && !['upcoming', 'past', 'archive'].includes(currentFilter);
            if (isGroupFilter) {
                const groupRsQuery = query(collection(db, 'runsheets'), where('groupId', '==', currentFilter));
                const groupRsSnap = await getDocs(groupRsQuery);
                const batch = writeBatch(db);
                let needsCommit = false;

                for (const rsDoc of groupRsSnap.docs) {
                    if (!userRsIds.has(rsDoc.id)) {
                        const rsId = rsDoc.id;
                        batch.set(doc(db, `runsheets/${rsId}/users`, user.email), { id: user.email, email: user.email, role: 'viewer' });
                        batch.set(doc(db, `users/${user.email}/runsheets`, rsId), { id: rsId });
                        userRsIds.add(rsId);
                        needsCommit = true;
                    }
                }
                if (needsCommit) await batch.commit();
            }

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
                        return { id: runsheetSnap.id, ...data, category: data.category || 'active', isEditor: role === 'editor' || role === 'owner' };
                    } catch (e) { return null; }
                })
            )).filter(Boolean);

            const uniqueGroupIds = [...new Set(withRoles.map(r => r.groupId).filter(Boolean))];
            const groupData = await Promise.all(uniqueGroupIds.map(async (gid) => {
                const groupSnap = await getDoc(doc(db, 'groups', gid));
                return groupSnap.exists() ? { id: gid, name: groupSnap.data().name } : null;
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
            setLoading(false);
            setIsSyncing(false);
        }
    }, [user, activeFilter]);

    useEffect(() => {
        if (user?.email) {
            fetchRunsheets();
        } else {
            setRunsheets([]);
            setGroups([]);
        }
    }, [user, fetchRunsheets]);

    return (
        <DashboardContext.Provider value={{
            runsheets, setRunsheets,
            groups, setGroups,
            loading, setLoading,
            isSyncing, setIsSyncing,
            activeFilter, setActiveFilter,
            refresh: fetchRunsheets
        }}>
            {children}
        </DashboardContext.Provider>
    );
};
