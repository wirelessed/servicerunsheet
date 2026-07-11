'use client';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import moment from 'moment';
import dynamic from 'next/dynamic';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';


const RunsheetMetadataDialog = dynamic(() => import('./RunsheetMetadataDialog'), { ssr: false });
const ConfirmationDialog = dynamic(() => import('../ConfirmationDialog'), { ssr: false });
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';

const GroupDialog = dynamic(() => import('./GroupDialog'), { ssr: false });
const ShareGroupDialog = dynamic(() => import('./ShareGroupDialog'), { ssr: false });
const ShareDialog = dynamic(() => import('./ShareDialog'), { ssr: false });
const WhatsNewDialog = dynamic(() => import('./WhatsNewDialog'), { ssr: false });

import { useDashboard } from '../../context/DashboardContext';
import SidebarFooter from './SidebarFooter';

export default function RunsheetList() {
    const { user, logOut, userHash } = useAuth();
    const router = useRouter();
    const {
        runsheets, setRunsheets,
        groups, setGroups,
        isSyncing, setIsSyncing,
        activeFilter, setActiveFilter,
        refresh,
        enrollInGroup,
        migrationState, setMigrationState,
        showGroupToast, setShowGroupToast
    } = useDashboard();

    const [theme, setTheme] = useState('dark');

    // Load activeFilter on mount / user resolution, consuming redirects if present
    useEffect(() => {
        if (!userHash) return;

        const tempFilter = localStorage.getItem('dashboard_filter');
        if (tempFilter) {
            setActiveFilter(tempFilter);
            localStorage.setItem(`dashboard_filter_${userHash}`, tempFilter);
            localStorage.removeItem('dashboard_filter');
        } else {
            const userFilterKey = `dashboard_filter_${userHash}`;
            const savedFilter = localStorage.getItem(userFilterKey);
            if (savedFilter) {
                setActiveFilter(savedFilter);
            } else {
                setActiveFilter('upcoming');
            }
        }
    }, [userHash, setActiveFilter]);

    // Auto-enroll in group when switching to a group filter
    useEffect(() => {
        if (activeFilter && !['upcoming', 'past', 'archive'].includes(activeFilter)) {
            enrollInGroup(activeFilter);
        }
    }, [activeFilter, enrollInGroup]);

    // Sort order
    const [sortOrder, setSortOrder] = useState('asc');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    const [metadataDialog, setMetadataDialog] = useState({ open: false, data: null });
    const [duplicateDialog, setDuplicateDialog] = useState({ open: false, runsheet: null, copyCollaborators: false });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, runsheetId: null });
    const [archiveDialog, setArchiveDialog] = useState({ open: false, runsheet: null });
    const [removeFromGroupDialog, setRemoveFromGroupDialog] = useState({ open: false, runsheet: null });
    const [groupDialog, setGroupDialog] = useState({ open: false, runsheet: null });
    const [shareGroupDialog, setShareGroupDialog] = useState({ open: false, group: null });
    const [shareDialog, setShareDialog] = useState({ open: false, runsheetId: null, runsheetName: null });
    const [whatsNewDialog, setWhatsNewDialog] = useState(false);
    const [renameGroupDialog, setRenameGroupDialog] = useState({ open: false, groupId: null, currentName: '' });
    const [archiveGroupDialog, setArchiveGroupDialog] = useState({ open: false, groupId: null });
    const [unarchiveGroupDialog, setUnarchiveGroupDialog] = useState({ open: false, groupId: null });
    const [renameGroupInput, setRenameGroupInput] = useState('');
    const [groupActionLoading, setGroupActionLoading] = useState(false);
    const [blockedArchiveDialog, setBlockedArchiveDialog] = useState(false);
    const [deleteGroupDialog, setDeleteGroupDialog] = useState({ open: false, group: null });
    const [notOwnerInfoDialog, setNotOwnerInfoDialog] = useState(false);

    // Pin group state
    const [lastGroupId, setLastGroupId] = useState('');

    // Load initial pinned group
    useEffect(() => {
        if (userHash) {
            const stored = localStorage.getItem(`lastGroup_${userHash}`);
            setLastGroupId(stored || '');
        } else {
            setLastGroupId('');
        }
    }, [userHash]);

    // Update pinned group when a group is active
    useEffect(() => {
        if (activeFilter && !['upcoming', 'past', 'archive', 'archived_groups'].includes(activeFilter)) {
            const groupObj = groups.find(g => g.id === activeFilter);
            if (groupObj && groupObj.archived === true) {
                return;
            }
            if (userHash) {
                localStorage.setItem(`lastGroup_${userHash}`, activeFilter);
                setLastGroupId(activeFilter);
            }
        }
    }, [activeFilter, groups, userHash]);

    // Cleanup pinned group if it gets deleted, becomes empty, or is archived
    useEffect(() => {
        if (lastGroupId && groups.length > 0) {
            const exists = groups.find(g => g.id === lastGroupId);
            const hasRunsheets = runsheets.some(r => r.groupId === lastGroupId);
            if (!exists || !hasRunsheets || exists.archived === true) {
                if (userHash) {
                    localStorage.removeItem(`lastGroup_${userHash}`);
                }
                setLastGroupId('');
            }
        }
    }, [lastGroupId, groups, runsheets, user]);

    const pinnedGroup = lastGroupId ? groups.find(g => g.id === lastGroupId) : null;
    const isPinnedGroupValid = pinnedGroup && runsheets.some(r => r.groupId === pinnedGroup.id);

    const activeGroups = groups.filter(g => {
        if (g.archived === true) return false;
        const isOwner = g.createdBy === user?.email;
        const isEmpty = !runsheets.some(r => r.groupId === g.id);
        if (!isOwner && isEmpty) return false;
        return true;
    });
    const archivedGroups = groups.filter(g => {
        if (g.archived !== true) return false;
        const isOwner = g.createdBy === user?.email;
        const isEmpty = !runsheets.some(r => r.groupId === g.id);
        if (!isOwner && isEmpty) return false;
        return true;
    });
    const handleRenameGroup = async () => {
        if (!renameGroupDialog.groupId || !renameGroupInput.trim()) return;
        const groupId = renameGroupDialog.groupId;
        const newName = renameGroupInput.trim();
        const originalGroups = [...groups];
        try {
            // Optimistic update
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
            setRenameGroupDialog({ open: false, groupId: null, currentName: '' });

            await setDoc(doc(db, 'groups', groupId), { name: newName }, { merge: true });
        } catch (err) {
            console.error('Error renaming group, rolling back...', err);
            setGroups(originalGroups);
            alert("Failed to rename group.");
        }
    };

    const handleArchiveGroup = async () => {
        if (!archiveGroupDialog.groupId) return;
        const groupId = archiveGroupDialog.groupId;
        const originalRunsheets = [...runsheets];
        const originalGroups = [...groups];

        try {
            // Optimistic update
            const updated = runsheets.map(r => r.groupId === groupId ? { ...r, category: 'archive' } : r);
            setRunsheets(updated);
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, archived: true } : g));
            setArchiveGroupDialog({ open: false, groupId: null });
            navigateToFilter('archived_groups');

            // Background updates
            const groupRsQuery = query(collection(db, 'runsheets'), where('groupId', '==', groupId));
            const groupRsSnap = await getDocs(groupRsQuery);
            const batch = writeBatch(db);
            groupRsSnap.docs.forEach(rsDoc => {
                batch.update(rsDoc.ref, { category: 'archive' });
            });
            batch.set(doc(db, 'groups', groupId), { archived: true }, { merge: true });
            await batch.commit();
        } catch (err) {
            console.error('Error archiving group, rolling back...', err);
            setRunsheets(originalRunsheets);
            setGroups(originalGroups);
            alert("Failed to archive group.");
        }
    };

    const handleUnarchiveGroup = async () => {
        if (!unarchiveGroupDialog.groupId) return;
        const groupId = unarchiveGroupDialog.groupId;
        const originalRunsheets = [...runsheets];
        const originalGroups = [...groups];

        try {
            // Optimistic update
            const updated = runsheets.map(r => r.groupId === groupId ? { ...r, category: 'active' } : r);
            setRunsheets(updated);
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, archived: false } : g));
            setUnarchiveGroupDialog({ open: false, groupId: null });
            navigateToFilter(groupId);

            // Background updates
            const groupRsQuery = query(collection(db, 'runsheets'), where('groupId', '==', groupId));
            const groupRsSnap = await getDocs(groupRsQuery);
            const batch = writeBatch(db);
            groupRsSnap.docs.forEach(rsDoc => {
                batch.update(rsDoc.ref, { category: 'active' });
            });
            batch.set(doc(db, 'groups', groupId), { archived: false }, { merge: true });
            await batch.commit();
        } catch (err) {
            console.error('Error unarchiving group, rolling back...', err);
            setRunsheets(originalRunsheets);
            setGroups(originalGroups);
            alert("Failed to unarchive group.");
        }
    };

    const handleDeleteGroup = async () => {
        if (!deleteGroupDialog.group) return;
        const groupId = deleteGroupDialog.group.id;
        const originalRunsheets = [...runsheets];
        const originalGroups = [...groups];

        try {
            setIsActionLoading(true);
            // Optimistic update
            setGroups(prev => prev.filter(g => g.id !== groupId));
            const updated = runsheets.map(r => r.groupId === groupId ? { ...r, groupId: null } : r);
            setRunsheets(updated);
            setDeleteGroupDialog({ open: false, group: null });

            if (activeFilter === groupId) {
                navigateToFilter('upcoming');
            }

            // Database updates
            const groupRsQuery = query(collection(db, 'runsheets'), where('groupId', '==', groupId));
            const groupRsSnap = await getDocs(groupRsQuery);
            const batch = writeBatch(db);
            groupRsSnap.docs.forEach(rsDoc => {
                batch.update(rsDoc.ref, { groupId: null });
            });
            batch.delete(doc(db, 'groups', groupId));
            await batch.commit();
        } catch (err) {
            console.error('Error deleting group, rolling back...', err);
            setRunsheets(originalRunsheets);
            setGroups(originalGroups);
            alert("Failed to delete group.");
        } finally {
            setIsActionLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            const isMigrationDoneOrNotNeeded = migrationState.status === 'none';
            if (isMigrationDoneOrNotNeeded) {
                const hasSeenWhatsNew = localStorage.getItem('hasSeenWhatsNew_v4.1');
                if (!hasSeenWhatsNew) {
                    setWhatsNewDialog(true);
                    localStorage.setItem('hasSeenWhatsNew_v4.1', 'true');
                }
            }
        }
    }, [user, migrationState.status]);

    // Update default sort order when filter changes
    useEffect(() => {
        const isDesc = activeFilter === 'past' || activeFilter === 'archive';
        setSortOrder(isDesc ? 'desc' : 'asc');
    }, [activeFilter]);

    // Navigate to filter: pure state setter, no URL changes
    const navigateToFilter = (filter) => {
        if (filter === activeFilter) return;
        setActiveFilter(filter);
    };

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            setTheme(storedTheme);
            document.documentElement.classList.toggle('dark', storedTheme === 'dark');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const handleCreateOrUpdate = async (formData) => {
        try {
            if (!user?.email) return;

            if (metadataDialog.data) {
                const targetRunsheet = runsheets.find(r => r.id === metadataDialog.data.id);
                if (!targetRunsheet || !targetRunsheet.isEditor) return;

                const runsheetRef = doc(db, 'runsheets', metadataDialog.data.id);
                const originalRunsheets = [...runsheets];

                // Optimistic Update
                const updated = runsheets.map(r => r.id === metadataDialog.data.id ? { ...r, name: formData.name, date: formData.date, time: formData.time } : r);
                setRunsheets(updated);
                setMetadataDialog({ open: false, data: null });

                // Background write
                await updateDoc(runsheetRef, { name: formData.name, date: formData.date, time: formData.time, lastUpdated: moment().format() });
            } else {
                let finalGroupId = null;
                if (formData.groupId === 'CREATE_NEW_GROUP') {
                    if (formData.newGroupName) {
                        finalGroupId = await handleCreateGroup(formData.newGroupName);
                    }
                } else if (formData.groupId !== undefined) {
                    finalGroupId = formData.groupId;
                } else {
                    const isGroup = activeFilter && !['upcoming', 'past', 'archive'].includes(activeFilter);
                    finalGroupId = isGroup ? activeFilter : null;
                }

                const runsheetRef = doc(collection(db, 'runsheets'));
                const newId = runsheetRef.id;

                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let shareToken = '';
                for (let i = 0; i < 6; i++) {
                    shareToken += chars.charAt(Math.floor(Math.random() * chars.length));
                }

                const newRunsheet = {
                    name: formData.name,
                    date: formData.date,
                    time: formData.time,
                    orderCount: 0,
                    lastUpdated: moment().format(),
                    category: 'active',
                    groupId: finalGroupId,
                    memberEmails: [user.email],
                    roles: { [user.email]: 'owner' },
                    shareToken: shareToken
                };

                // Write all documents before dismissing
                await setDoc(runsheetRef, newRunsheet);
                await setDoc(doc(db, `users/${user.email}/runsheets`, newId), { id: newId });
                await setDoc(doc(db, `runsheets/${newId}/users`, user.email), {
                    id: user.email,
                    role: 'owner',
                    email: user.email
                });

                // Now safe to update UI
                setMetadataDialog({ open: false, data: null });
            }
        } catch (err) {
            console.error("Error saving runsheet", err);
            alert("Failed to save runsheet changes. Please try again.");
            // onSnapshot will automatically reconcile with the server, but we trigger a migration sync check just in case
            refresh();
        }
    };


    const handleCreateGroup = async (name) => {
        try {
            const groupRef = doc(collection(db, 'groups'));
            const groupId = groupRef.id;

            // Optimistic Update
            setGroups(prev => [...prev, { id: groupId, name }]);

            // Background write
            setDoc(groupRef, {
                name,
                createdBy: user.email,
                createdAt: moment().format()
            }).catch(err => {
                console.error("Error creating group in db", err);
                setGroups(prev => prev.filter(g => g.id !== groupId));
            });

            return groupId;
        } catch (err) {
            console.error("Error creating group", err);
            throw err;
        }
    };



    const checkGroupEmptyAfterAction = (updatedRunsheets) => {
        const isGroup = activeFilter && !['upcoming', 'past', 'archive', 'archived_groups'].includes(activeFilter);
        if (isGroup) {
            const group = groups.find(g => g.id === activeFilter);
            const isOwner = group?.createdBy === user?.email;
            if (!isOwner) {
                const remaining = updatedRunsheets.filter(r => r.groupId === activeFilter && r.category !== 'archive');
                if (remaining.length === 0) {
                    navigateToFilter('upcoming');
                }
            }
        }
    };

    const handleSetGroup = async (runsheetId, groupId) => {
        const targetRunsheet = runsheets.find(r => r.id === runsheetId);
        if (!targetRunsheet || !targetRunsheet.isEditor) return;

        const originalRunsheets = [...runsheets];
        try {
            // Optimistic Update
            const updated = runsheets.map(r => r.id === runsheetId ? { ...r, groupId } : r);
            setRunsheets(updated);
            setGroupDialog({ open: false, runsheet: null });
            navigateToFilter(groupId);

            // Background update
            await updateDoc(doc(db, 'runsheets', runsheetId), { groupId });
        } catch (err) {
            console.error("Error setting group, rolling back...", err);
            setRunsheets(originalRunsheets);
            alert("Failed to assign runsheet to group.");
        }
    };

    const handleRemoveFromGroup = async () => {
        if (!removeFromGroupDialog.runsheet) return;
        const runsheetId = removeFromGroupDialog.runsheet.id;
        const targetRunsheet = runsheets.find(r => r.id === runsheetId);
        if (!targetRunsheet || !targetRunsheet.isEditor) return;

        const originalRunsheets = [...runsheets];
        try {
            // Optimistic Update
            const updated = runsheets.map(r => r.id === runsheetId ? { ...r, groupId: null } : r);
            setRunsheets(updated);
            checkGroupEmptyAfterAction(updated);
            setRemoveFromGroupDialog({ open: false, runsheet: null });

            // Background update
            await updateDoc(doc(db, 'runsheets', runsheetId), { groupId: null });
        } catch (err) {
            console.error("Error removing from group, rolling back...", err);
            setRunsheets(originalRunsheets);
            alert("Failed to remove runsheet from group.");
        }
    };

    const duplicateRunsheet = async (runsheet, copyCollaborators = false) => {
        try {
            setIsActionLoading(true);
            const q = query(collection(db, `runsheets/${runsheet.id}/programme`), orderBy('orderCount', 'asc'));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => doc.data());

            const newDocRef = doc(collection(db, 'runsheets'));
            const newId = newDocRef.id;

            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let shareToken = '';
            for (let i = 0; i < 6; i++) {
                shareToken += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const newRunsheet = {
                name: runsheet.name + (runsheet.name.endsWith(' (Copy)') ? '' : ' (Copy)'),
                date: runsheet.date,
                time: runsheet.time || '',
                category: 'active',
                groupId: runsheet.groupId || null,
                lastUpdated: moment().format(),
                orderCount: runsheet.orderCount || 0,
                memberEmails: [user.email],
                roles: { [user.email]: 'owner' },
                shareToken: shareToken
            };

            // Write all documents before dismissing
            await setDoc(newDocRef, newRunsheet);
            await setDoc(doc(db, `users/${user.email}/runsheets`, newId), { id: newId });
            const batch = writeBatch(db);
            batch.set(doc(db, `runsheets/${newId}/users`, user.email), {
                id: user.email,
                role: 'owner',
                email: user.email
            });

            if (copyCollaborators && (runsheet.role === 'owner' || runsheet.role === 'editor')) {
                const usersSnap = await getDocs(collection(db, `runsheets/${runsheet.id}/users`));
                const memberEmails = [user.email];
                const roles = { [user.email]: 'owner' };

                usersSnap.docs.forEach(userDoc => {
                    if (userDoc.id !== user.email) {
                        const userData = userDoc.data();
                        batch.set(doc(db, `runsheets/${newId}/users`, userDoc.id), userData);
                        batch.set(doc(db, `users/${userDoc.id}/runsheets`, newId), { id: newId });

                        const email = userDoc.id.trim().toLowerCase();
                        memberEmails.push(email);
                        roles[email] = userData.role || 'viewer';
                    }
                });

                batch.update(newDocRef, { memberEmails, roles });
            }

            items.forEach((item) => {
                batch.set(doc(collection(db, `runsheets/${newId}/programme`)), item);
            });
            await batch.commit();

            // Now safe to update UI
            setDuplicateDialog({ open: false, runsheet: null, copyCollaborators: false });
            setIsActionLoading(false);

        } catch (err) {
            console.error("Error duplicating runsheet", err);
            setIsActionLoading(false);
            alert("Failed to duplicate runsheet.");
        }
    };
    const handleDelete = async () => {
        if (!deleteDialog.runsheetId) return;
        const runsheetId = deleteDialog.runsheetId;
        const targetRunsheet = runsheets.find(r => r.id === runsheetId);
        if (!targetRunsheet || !targetRunsheet.isEditor) return;

        const originalRunsheets = [...runsheets];
        try {
            // Optimistic Update
            const updated = runsheets.filter(r => r.id !== runsheetId);
            setRunsheets(updated);
            checkGroupEmptyAfterAction(updated);
            setDeleteDialog({ open: false, runsheetId: null });

            // Background deletion
            await deleteDoc(doc(db, 'runsheets', runsheetId));
            await deleteDoc(doc(db, `users/${user.email}/runsheets`, runsheetId));
        } catch (err) {
            console.error('Error deleting runsheet, rolling back...', err);
            setRunsheets(originalRunsheets);
            alert("Failed to delete runsheet.");
        }
    };

    const handleArchiveToggle = async () => {
        if (!archiveDialog.runsheet) return;
        const runsheet = archiveDialog.runsheet;
        if (!runsheet.isEditor) return;

        const newCategory = runsheet.category === 'archive' ? 'active' : 'archive';
        const originalRunsheets = [...runsheets];
        try {
            // Optimistic Update
            const updated = runsheets.map(r => r.id === runsheet.id ? { ...r, category: newCategory } : r);
            setRunsheets(updated);
            checkGroupEmptyAfterAction(updated);
            setArchiveDialog({ open: false, runsheet: null });

            // Background update
            await updateDoc(doc(db, 'runsheets', runsheet.id), { category: newCategory });
        } catch (err) {
            console.error('Error updating category, rolling back...', err);
            setRunsheets(originalRunsheets);
            alert("Failed to archive runsheet.");
        }
    };

    // Group runsheets by month
    const groupRunsheets = (data) => {
        const groups = {};
        data.forEach(item => {
            const key = moment(item.date).format('MMMM YYYY');
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    };

    // Render list
    const renderRunsheetList = (listData) => {
        const searched = listData.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
        searched.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            const diff = dateA - dateB;
            if (diff === 0) {
                const timeA = a.time || "";
                const timeB = b.time || "";
                return sortOrder === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
            }
            return sortOrder === 'asc' ? diff : -diff;
        });

        const grouped = groupRunsheets(searched);
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            const dateA = moment(a, 'MMMM YYYY').toDate();
            const dateB = moment(b, 'MMMM YYYY').toDate();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        if (searched.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-24 px-8 page-enter text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                        <span className={`material-symbols-outlined text-3xl text-muted-foreground ${isSyncing ? 'animate-spin' : ''}`}>
                            {isSyncing ? 'sync' : 'event_busy'}
                        </span>
                    </div>
                    <p className="text-base font-semibold text-foreground">
                        {isSyncing ? 'Loading runsheets...' : 'No runsheets found'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isSyncing ? '' : 'Create a new runsheet to get started.'}
                    </p>
                </div>
            );
        }

        return (
            <div className="page-enter">
                {sortedKeys.map(groupKey => (
                    <div key={groupKey} className="mb-2">
                        {/* Month header */}
                        <div className="px-4 md:px-0 py-3">
                            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{groupKey}</h2>
                        </div>
                        {/* Cards */}
                        <div className="grid grid-cols-1 gap-5 md:gap-6 px-4 md:px-0 pb-4">
                            {grouped[groupKey].map(runsheet => {
                                const dateObj = moment(runsheet.date);
                                const niceDate = dateObj.format('D');
                                const dayName = dateObj.format('ddd');
                                const monthShort = dateObj.format('MMM');
                                const isToday = dateObj.isSame(moment(), 'day');
                                const isPast = dateObj.isBefore(moment(), 'day');

                                return (
                                    <div key={runsheet.id} className="group relative">
                                        <Link
                                            href={`/runsheet/${runsheet.id}`}
                                            className={`
                                                block p-0 transition-all duration-300
                                                hover:-translate-y-0.5
                                                active:scale-[0.98]
                                            `}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Date badge */}
                                                <div className={`
                                                    flex flex-col items-center justify-center w-14 h-14 rounded-xl shrink-0 transition-colors
                                                    ${isToday
                                                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                                        : isPast
                                                            ? 'bg-muted text-muted-foreground'
                                                            : 'bg-primary/8 dark:bg-primary/12 text-primary'
                                                    }
                                                `}>
                                                    <span className="text-[10px] font-bold uppercase tracking-wide leading-none">{dayName}</span>
                                                    <span className="text-xl font-extrabold leading-none mt-0.5">{niceDate}</span>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 pr-8">
                                                    <h3 className="text-[15px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                                        {runsheet.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1 mt-1 flex-wrap overflow-hidden">
                                                        {runsheet.groupId && (
                                                            <div
                                                                className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]"
                                                            >
                                                                {groups.find(g => g.id === runsheet.groupId)?.name || 'Group'}
                                                            </div>
                                                        )}
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            Last updated {moment(runsheet.lastUpdated).fromNow()}
                                                        </span>
                                                        {!runsheet.isOwner && (
                                                            <div className="flex items-center text-muted-foreground ml-0.5" title="Shared with me">
                                                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>people_alt</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isToday && (
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-success">Today</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>


                                        {/* Mobile more button */}
                                        <div className="absolute top-1 right-0">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-all">
                                                        <span className="material-symbols-outlined text-lg">more_vert</span>
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-64">
                                                    {runsheet.isEditor && (
                                                        <DropdownMenuItem onClick={() => setMetadataDialog({ open: true, data: runsheet })}>
                                                            <span className="material-symbols-outlined text-base mr-2">edit</span>
                                                            Edit/Rename
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => setDuplicateDialog({ open: true, runsheet, copyCollaborators: false })}>
                                                        <span className="material-symbols-outlined text-base mr-2">content_copy</span>
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                     <DropdownMenuItem onClick={() => setShareDialog({ open: true, runsheetId: runsheet.id, runsheetName: runsheet.name })}>
                                                         <span className="material-symbols-outlined text-base mr-2">share</span>
                                                         Share
                                                     </DropdownMenuItem>
                                                    {runsheet.isEditor && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setGroupDialog({ open: true, runsheet })}>
                                                                <span className="material-symbols-outlined text-base mr-2">folder_open</span>
                                                                {runsheet.groupId ? 'Move to another group' : 'Add to Group'}
                                                            </DropdownMenuItem>
                                                            {runsheet.groupId && (
                                                                <DropdownMenuItem onClick={() => setRemoveFromGroupDialog({ open: true, runsheet })}>
                                                                    <span className="material-symbols-outlined text-base mr-2">folder_off</span>
                                                                    Remove from Group
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => {
                                                                if (runsheet.groupId) {
                                                                    setBlockedArchiveDialog(true);
                                                                } else {
                                                                    setArchiveDialog({ open: true, runsheet });
                                                                }
                                                            }}>
                                                                <span className="material-symbols-outlined text-base mr-2">{runsheet.category === 'archive' ? 'unarchive' : 'inventory_2'}</span>
                                                                {runsheet.category === 'archive' ? 'Unarchive' : 'Archive'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteDialog({ open: true, runsheetId: runsheet.id })}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <span className="material-symbols-outlined text-base mr-2">delete</span>
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Filter Logic
    const today = moment().startOf('day');
    const upcomingRunsheets = runsheets.filter(r => {
        if (r.category === 'archive') return false;
        return moment(r.date).startOf('day').isSameOrAfter(today);
    });
    const pastRunsheets = runsheets.filter(r => {
        if (r.category === 'archive') return false;
        return moment(r.date).startOf('day').isBefore(today);
    });
    const archivedRunsheets = runsheets.filter(r => r.category === 'archive');

    const groupRunsheetsList = activeFilter && activeFilter !== 'upcoming' && activeFilter !== 'past' && activeFilter !== 'archive' && activeFilter !== 'archived_groups'
        ? runsheets.filter(r => r.groupId === activeFilter)
        : [];



    const tabCounts = {
        upcoming: upcomingRunsheets.length,
        past: pastRunsheets.length,
        archive: archivedRunsheets.length,
        ...Object.fromEntries(groups.map(g => [g.id, runsheets.filter(r => r.groupId === g.id).length]))
    };

    return (
        <div className="relative flex h-full min-h-screen w-full flex-row overflow-hidden bg-background text-foreground">

            {/* ── Desktop Sidebar ── */}
            <aside className="hidden md:flex flex-col w-[260px] border-r border-border bg-sidebar pt-6 pb-4 justify-between h-screen sticky top-0">
                <div className="flex flex-col gap-1 px-4">
                    {/* Brand */}
                    <div className="flex items-center gap-3 px-3 mb-6">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/15">
                            <span className="material-symbols-outlined text-primary text-lg icon-filled">event_note</span>
                        </div>
                        <h1 className="text-lg font-extrabold tracking-tight text-foreground">RunsheetPro</h1>
                    </div>

                    {/* Nav items: Upcoming */}
                    <div className="flex flex-col gap-0.5">
                        <button
                            onClick={() => navigateToFilter('upcoming')}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                ${activeFilter === 'upcoming'
                                    ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }
                            `}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${activeFilter === 'upcoming' ? 'icon-filled' : ''}`}>upcoming</span>
                            Upcoming
                        </button>
                    </div>

                    {/* Groups section */}
                    <div className="flex flex-col gap-0.5 mt-6 px-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">My Groups</p>
                        {activeGroups.map(group => {
                            const isGroupActive = activeFilter === group.id;
                            const isGroupOwner = group.createdBy === user?.email;
                            const isGroupEmpty = !runsheets.some(r => r.groupId === group.id);
                            return (
                                <div
                                    key={group.id}
                                    className={`
                                        group flex items-center justify-between px-3 py-0.5 rounded-xl transition-all duration-200
                                        ${isGroupActive
                                            ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }
                                    `}
                                >
                                    <button
                                        onClick={() => navigateToFilter(group.id)}
                                        className="flex items-center gap-3 flex-1 min-w-0 py-2 text-sm font-semibold text-left"
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${isGroupActive ? 'icon-filled' : ''}`}>folder</span>
                                        <span className="truncate flex-1">{group.name}</span>
                                    </button>

                                    <div className="flex items-center gap-1.5 ml-2">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isGroupActive ? 'bg-primary/15 text-primary' : 'bg-background text-muted-foreground'}`}>
                                            {tabCounts[group.id] || 0}
                                        </span>
                                        {isGroupOwner ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center w-6 h-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-all"
                                                        title="Manage group"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">more_vert</span>
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem
                                                        className="cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRenameGroupInput(group.name);
                                                            setRenameGroupDialog({ open: true, groupId: group.id, currentName: group.name });
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-base mr-2">drive_file_rename_outline</span>
                                                        Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShareGroupDialog({ open: true, group });
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-base mr-2">share</span>
                                                        Share
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="cursor-pointer text-destructive focus:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setArchiveGroupDialog({ open: true, groupId: group.id });
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-base mr-2">inventory_2</span>
                                                        Archive
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="cursor-pointer text-destructive focus:text-destructive font-semibold"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteGroupDialog({ open: true, group });
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined text-base mr-2">delete</span>
                                                        Delete Group
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNotOwnerInfoDialog(true);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center w-6 h-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-all"
                                                title="Group info"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">info</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <button
                            onClick={() => navigateToFilter('archived_groups')}
                            className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                    ${activeFilter === 'archived_groups' || archivedGroups.some(g => g.id === activeFilter)
                                    ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }
                                `}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${activeFilter === 'archived_groups' || archivedGroups.some(g => g.id === activeFilter) ? 'icon-filled' : ''}`}>inventory_2</span>
                            Archived Groups
                        </button>
                        {(activeFilter === 'archived_groups' || archivedGroups.some(g => g.id === activeFilter)) && (
                            <div className="flex flex-col gap-0.5 mt-0.5 pl-3 border-l border-border ml-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                {archivedGroups.map(group => {
                                    const isGroupActive = activeFilter === group.id;
                                    const isGroupOwner = group.createdBy === user?.email;
                                    const isGroupEmpty = !runsheets.some(r => r.groupId === group.id);
                                    return (
                                        <div
                                            key={group.id}
                                            className={`
                                                group flex items-center justify-between px-3 py-0.5 rounded-xl transition-all duration-200
                                                ${isGroupActive
                                                    ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                }
                                            `}
                                        >
                                            <button
                                                onClick={() => navigateToFilter(group.id)}
                                                className="flex items-center gap-3 flex-1 min-w-0 py-2 text-sm font-semibold text-left"
                                            >
                                                <span className={`material-symbols-outlined text-[20px] ${isGroupActive ? 'icon-filled' : ''}`}>folder_zip</span>
                                                <span className="truncate flex-1">{group.name}</span>
                                            </button>

                                            <div className="flex items-center gap-1.5 ml-2">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isGroupActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    {tabCounts[group.id] || 0}
                                                </span>
                                                {isGroupOwner ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center w-6 h-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-all"
                                                                title="Manage group"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">more_vert</span>
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRenameGroupInput(group.name);
                                                                    setRenameGroupDialog({ open: true, groupId: group.id, currentName: group.name });
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined text-base mr-2">drive_file_rename_outline</span>
                                                                Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShareGroupDialog({ open: true, group });
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined text-base mr-2">share</span>
                                                                Share
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="cursor-pointer font-semibold text-primary focus:text-primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setUnarchiveGroupDialog({ open: true, groupId: group.id });
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined text-base mr-2">unarchive</span>
                                                                Unarchive
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer text-destructive focus:text-destructive font-semibold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteGroupDialog({ open: true, group });
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined text-base mr-2">delete</span>
                                                                Delete Group
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setNotOwnerInfoDialog(true);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center w-6 h-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-all"
                                                        title="Group info"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">info</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Nav items: Past & Archive */}
                    <div className="flex flex-col gap-0.5 mt-6">
                        {[
                            { key: 'past', icon: 'history', label: 'Past' },
                            { key: 'archive', icon: 'archive', label: 'Archive' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => navigateToFilter(tab.key)}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                    ${activeFilter === tab.key
                                        ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }
                                `}
                            >
                                <span className={`material-symbols-outlined text-[20px] ${activeFilter === tab.key ? 'icon-filled' : ''}`}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bottom section */}
                <SidebarFooter theme={theme} toggleTheme={toggleTheme} layout="full" />
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full scrollbar-thin">
                {/* Sync Progress Bar */}
                {isSyncing && (
                    <>
                        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/20 overflow-hidden">
                            <div className="h-full bg-primary animate-indeterminate-progress w-full origin-left"></div>
                        </div>
                        <div className="fixed top-3 right-4 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Refreshing data...</span>
                        </div>
                    </>
                )}
                <div className="w-full max-w-5xl mx-auto pb-28 md:pb-12 relative">

                    {/* Header */}
                    <header className="sticky top-0 z-50 bg-background border-b border-border/30 md:pl-8 md:pr-8">
                        <div className="px-4 md:px-0 pt-4 pb-2">
                            {/* Top bar */}
                            {!showSearch && (
                                <div className="flex items-center justify-between mb-4 relative">
                                    {/* Mobile: Hamburger menu */}
                                    <div className="md:hidden">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex size-10 items-center justify-center rounded-xl hover:bg-muted text-foreground transition-all active:scale-95">
                                                    <span className="material-symbols-outlined text-[22px]">menu</span>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56">
                                                <DropdownMenuItem disabled className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={user?.photoURL} />
                                                        <AvatarFallback className="text-[9px]">{user?.displayName?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    {user?.displayName}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                                                    <span className="material-symbols-outlined text-base mr-2">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                                                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => window.location.href = '/feedback'}
                                                    className="cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-base mr-2">feedback</span>
                                                    Feedback
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={async () => {
                                                        try {
                                                            Object.keys(localStorage).forEach(key => {
                                                                if (key.startsWith('runsheetsCache_') || key.startsWith('groupsCache_') || key.startsWith('public_group')) {
                                                                    localStorage.removeItem(key);
                                                                }
                                                            });
                                                            const dbs = await window.indexedDB.databases();
                                                            for (const dbInfo of dbs) {
                                                                if (dbInfo.name && dbInfo.name.startsWith('firebaseLocalStorage')) {
                                                                    window.indexedDB.deleteDatabase(dbInfo.name);
                                                                }
                                                            }
                                                            window.location.reload();
                                                        } catch (e) {
                                                            console.error('Error clearing cache:', e);
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-base mr-2">cached</span>
                                                    Clear Cache
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive cursor-pointer">
                                                    <span className="material-symbols-outlined text-base mr-2">logout</span>
                                                    Log Out
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Mobile Center: RunsheetPro Branding */}
                                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 md:hidden">
                                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/15">
                                            <span className="material-symbols-outlined text-primary text-base icon-filled">event_note</span>
                                        </div>
                                        <span className="text-base font-extrabold tracking-tight text-foreground">RunsheetPro</span>
                                    </div>

                                    <div className="hidden md:block" />

                                    {/* Right actions */}
                                    <div className="flex items-center gap-1.5">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex size-9 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95">
                                                    <span className="material-symbols-outlined text-[20px]">swap_vert</span>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setSortOrder('desc')} className="cursor-pointer">
                                                    Latest first
                                                    {sortOrder === 'desc' && <span className="material-symbols-outlined text-sm ml-auto text-primary">check</span>}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSortOrder('asc')} className="cursor-pointer">
                                                    Oldest first
                                                    {sortOrder === 'asc' && <span className="material-symbols-outlined text-sm ml-auto text-primary">check</span>}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <button
                                            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
                                            className={`flex size-9 items-center justify-center rounded-xl hover:bg-muted transition-all active:scale-95 ${showSearch ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">search</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Title or Search */}
                            <div className="min-h-[48px] flex items-center">
                                {showSearch ? (
                                    <div className="w-full flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button
                                            onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                                            className="flex size-10 shrink-0 items-center justify-center rounded-xl hover:bg-muted text-foreground transition-all active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                                        </button>
                                        <Input
                                            autoFocus
                                            placeholder="Search runsheets..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-muted/60 border-transparent focus:border-primary rounded-xl h-12 text-base"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                        {(() => {
                                            const group = groups.find(g => g.id === activeFilter);
                                            const isArchivedGroups = activeFilter === 'archived_groups';
                                            if (!group && !isArchivedGroups) return null;
                                            const iconName = (group?.archived || isArchivedGroups) ? 'folder_zip' : 'folder';
                                            return (
                                                <span className="material-symbols-outlined text-[24px] md:text-[28px] text-muted-foreground/80 shrink-0 select-none">
                                                    {iconName}
                                                </span>
                                            );
                                        })()}
                                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                                            {activeFilter === 'upcoming' ? 'Upcoming' :
                                                activeFilter === 'past' ? 'Past' :
                                                    activeFilter === 'archive' ? 'Archive' :
                                                        activeFilter === 'archived_groups' ? 'Archived Groups' :
                                                            groups.find(g => g.id === activeFilter)?.name || 'Group'}
                                        </h1>
                                        {/* Inline group edit button — only shown when viewing a group */}
                                        {activeFilter && !['upcoming', 'past', 'archive'].includes(activeFilter) && (() => {
                                            const activeGroup = groups.find(g => g.id === activeFilter);
                                            if (!activeGroup) return null;
                                            const isGroupOwner = activeGroup.createdBy === user?.email;
                                            const isGroupEmpty = !runsheets.some(r => r.groupId === activeGroup.id);
                                            const canManageGroup = groupRunsheetsList.length > 0
                                                ? groupRunsheetsList.every(r => r.isEditor)
                                                : isGroupOwner;
                                            return (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="Manage group">
                                                            <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-44">
                                                        {canManageGroup && (
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => {
                                                                    setRenameGroupInput(activeGroup.name);
                                                                    setRenameGroupDialog({ open: true, groupId: activeGroup.id, currentName: activeGroup.name });
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined text-base mr-2">drive_file_rename_outline</span>
                                                                Rename Group
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="cursor-pointer"
                                                            onClick={() => setShareGroupDialog({ open: true, group: activeGroup })}
                                                        >
                                                            <span className="material-symbols-outlined text-base mr-2">share</span>
                                                            Share Group
                                                        </DropdownMenuItem>
                                                        {canManageGroup && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                {activeGroup.archived ? (
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer font-semibold text-primary focus:text-primary"
                                                                        onClick={() => setUnarchiveGroupDialog({ open: true, groupId: activeGroup.id })}
                                                                    >
                                                                        <span className="material-symbols-outlined text-base mr-2">unarchive</span>
                                                                        Unarchive Group
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer text-destructive focus:text-destructive"
                                                                        onClick={() => setArchiveGroupDialog({ open: true, groupId: activeGroup.id })}
                                                                    >
                                                                        <span className="material-symbols-outlined text-base mr-2">inventory_2</span>
                                                                        Archive Group
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </>
                                                        )}
                                                        {isGroupOwner && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="cursor-pointer text-destructive focus:text-destructive font-semibold"
                                                                    onClick={() => setDeleteGroupDialog({ open: true, group: activeGroup })}
                                                                >
                                                                    <span className="material-symbols-outlined text-base mr-2">delete</span>
                                                                    Delete Group
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tab Pills — Mobile only */}
                        {!showSearch && (
                            <div className="md:hidden px-4 pb-3 overflow-x-auto scrollbar-hide">
                                <div className="flex items-center gap-1.5 w-max">
                                    <button
                                        onClick={() => navigateToFilter('upcoming')}
                                        className={`
                                        px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200 whitespace-nowrap border
                                        ${activeFilter === 'upcoming'
                                                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                                : 'bg-muted/80 border-border/40 text-muted-foreground hover:text-foreground'
                                            }
                                    `}
                                    >
                                        upcoming
                                    </button>
                                    {/* Pinned Group Pill */}
                                    {isPinnedGroupValid && (
                                        <button
                                            onClick={() => navigateToFilter(pinnedGroup.id)}
                                            className={`
                                                px-4 py-2 max-h-[34.5px] rounded-xl text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200 whitespace-nowrap border flex items-center gap-1
                                                ${activeFilter === pinnedGroup.id
                                                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                                    : 'bg-muted/80 border-border/40 text-muted-foreground hover:text-foreground'
                                                }
                                            `}
                                        >
                                            <span className="truncate max-w-[100px]">{pinnedGroup.name}</span>
                                            <span className={`
                                                text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0
                                                ${activeFilter === pinnedGroup.id
                                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                                    : 'bg-muted-foreground/10 text-muted-foreground'
                                                }
                                            `}>
                                                {tabCounts[pinnedGroup.id] || 0}
                                            </span>
                                        </button>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={`
                                                    px-4 py-2 max-h-[34.5px] rounded-xl text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200 whitespace-nowrap border flex items-center gap-1
                                                    ${activeFilter === 'archived_groups'
                                                        ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                                        : 'bg-muted/80 border-border/40 text-muted-foreground hover:text-foreground'
                                                    }
                                                `}
                                            >
                                                GROUPS
                                                <span className="material-symbols-outlined text-[14px]">expand_more</span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-56 p-1.5 max-h-[60vh] overflow-y-auto">
                                            {activeGroups.map(group => (
                                                <DropdownMenuItem
                                                    key={group.id}
                                                    onClick={() => navigateToFilter(group.id)}
                                                    className="cursor-pointer flex items-center py-2.5 px-3 rounded-xl hover:bg-muted/80"
                                                >
                                                    <span className={`material-symbols-outlined text-[18px] mr-2 shrink-0 ${activeFilter === group.id ? 'text-primary icon-filled' : 'text-muted-foreground'}`}>folder</span>
                                                    <span className={`truncate flex-1 text-left ${activeFilter === group.id ? 'font-bold text-primary' : ''}`}>{group.name}</span>
                                                    <span className="ml-2 text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground shrink-0">
                                                        {tabCounts[group.id] || 0}
                                                    </span>
                                                </DropdownMenuItem>
                                            ))}
                                            {activeGroups.length > 0 && <DropdownMenuSeparator className="my-1.5" />}
                                            <DropdownMenuItem
                                                onClick={() => navigateToFilter('archived_groups')}
                                                className="cursor-pointer flex items-center py-2.5 px-3 rounded-xl text-muted-foreground hover:bg-muted/80"
                                            >
                                                <span className={`material-symbols-outlined text-[18px] mr-2 shrink-0 ${activeFilter === 'archived_groups' ? 'text-primary icon-filled' : ''}`}>folder_zip</span>
                                                <span className={`truncate flex-1 text-left ${activeFilter === 'archived_groups' ? 'font-bold text-primary' : ''}`}>Archived Groups</span>
                                            </DropdownMenuItem>
                                            {(() => {
                                                const activeArchivedGroup = archivedGroups.find(g => g.id === activeFilter);
                                                if (!activeArchivedGroup) return null;
                                                return (
                                                    <DropdownMenuItem
                                                        onClick={() => navigateToFilter(activeArchivedGroup.id)}
                                                        className="cursor-pointer flex items-center py-2.5 px-3 ml-2 mr-2 mt-1.5 bg-primary/10 hover:bg-primary/15 rounded-xl text-primary animate-in slide-in-from-top-2 fade-in duration-200"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] mr-2 shrink-0 text-primary">folder_zip</span>
                                                        <span className="truncate flex-1 text-left font-bold text-sm">{activeArchivedGroup.name}</span>
                                                    </DropdownMenuItem>
                                                );
                                            })()}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    {['past', 'archive'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => navigateToFilter(tab)}
                                            className={`
                                            px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200 whitespace-nowrap border
                                            ${activeFilter === tab
                                                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                                    : 'bg-muted/80 border-border/40 text-muted-foreground hover:text-foreground'
                                                }
                                        `}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col mt-2 md:pl-8 md:pr-8">
                        <div className="w-full flex-1 flex flex-col">
                            {showSearch
                                ? (searchQuery.trim() ? renderRunsheetList(runsheets) : (
                                    <div className="flex flex-col items-center justify-center h-full pt-20 md:pt-32 text-muted-foreground/50">
                                        <span className="material-symbols-outlined text-5xl mb-4 opacity-40">search</span>
                                        <p className="text-sm font-medium">Type to search runsheets</p>
                                    </div>
                                ))
                                : activeFilter === 'archived_groups' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                                        {archivedGroups.length > 0 ? archivedGroups.map(group => {
                                            const groupRunsheetsCount = runsheets.filter(r => r.groupId === group.id).length;
                                            return (
                                                <div
                                                    key={group.id}
                                                    onClick={() => navigateToFilter(group.id)}
                                                    className="relative group/card overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all duration-300 text-left cursor-pointer"
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted text-muted-foreground shrink-0">
                                                                <span className="material-symbols-outlined">inventory_2</span>
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <h3 className="font-bold text-foreground text-lg truncate group-hover/card:text-primary transition-colors">{group.name}</h3>
                                                                <span className="text-xs font-medium text-muted-foreground mt-0.5">
                                                                    {groupRunsheetsCount} {groupRunsheetsCount === 1 ? 'runsheet' : 'runsheets'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95">
                                                                        <span className="material-symbols-outlined text-lg">more_vert</span>
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuItem
                                                                        onClick={() => setUnarchiveGroupDialog({ open: true, groupId: group.id })}
                                                                        className="cursor-pointer font-semibold text-primary focus:text-primary py-2.5"
                                                                    >
                                                                        <span className="material-symbols-outlined text-base mr-2">unarchive</span>
                                                                        Unarchive Group
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="col-span-full flex flex-col items-center justify-center h-full pt-20 text-muted-foreground/50">
                                                <span className="material-symbols-outlined text-5xl mb-4 opacity-40">inventory_2</span>
                                                <p className="text-sm font-medium">No archived groups</p>
                                            </div>
                                        )}
                                    </div>
                                )
                                    : activeFilter === 'upcoming' ? renderRunsheetList(upcomingRunsheets)
                                        : activeFilter === 'past' ? renderRunsheetList(pastRunsheets)
                                            : activeFilter === 'archive' ? renderRunsheetList(archivedRunsheets)
                                                : renderRunsheetList(groupRunsheetsList)
                            }
                        </div>
                        {/* Share Group button — shown at bottom when viewing a group the user owns */}
                        {!showSearch && activeFilter && activeFilter !== 'upcoming' && activeFilter !== 'past' && activeFilter !== 'archive' && (() => {
                            const activeGroup = groups.find(g => g.id === activeFilter);
                            if (!activeGroup) return null;
                            return (
                                <div className="flex justify-center py-6 md:pl-8 md:pr-8">
                                    <button
                                        onClick={() => setShareGroupDialog({ open: true, group: activeGroup })}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/60 hover:bg-primary/10 border border-border/40 hover:border-primary/30 text-muted-foreground hover:text-primary text-sm font-semibold transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">share</span>
                                        Share Group
                                    </button>
                                </div>
                            );
                        })()}
                    </main>

                    {/* FAB */}
                    {!showSearch && (
                        <button
                            onClick={() => setMetadataDialog({ open: true, data: null })}
                            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 h-14 w-14 rounded-2xl bg-primary shadow-xl shadow-primary/25 flex items-center justify-center text-primary-foreground hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all duration-300 z-50 float-animation group"
                        >
                            <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform duration-300">add</span>
                        </button>
                    )}

                    {/* Dialogs */}
                    <RunsheetMetadataDialog
                        open={metadataDialog.open}
                        onClose={() => !isActionLoading && setMetadataDialog({ open: false, data: null })}
                        onSubmit={handleCreateOrUpdate}
                        initialData={metadataDialog.data}
                        isLoading={isActionLoading}
                        groups={groups}
                        activeFilter={activeFilter}
                    />

                    <ConfirmationDialog
                        open={archiveDialog.open}
                        onClose={() => !isActionLoading && setArchiveDialog({ open: false, runsheet: null })}
                        onConfirm={handleArchiveToggle}
                        title={archiveDialog.runsheet?.category === 'archive' ? 'Unarchive Runsheet' : 'Archive Runsheet'}
                        message={archiveDialog.runsheet?.category === 'archive'
                            ? `Are you sure you want to unarchive "${archiveDialog.runsheet?.name}"? It will be moved back to your active lists.`
                            : `Are you sure you want to archive "${archiveDialog.runsheet?.name}"? It will be hidden from the main view.`}
                        confirmText={archiveDialog.runsheet?.category === 'archive' ? 'Unarchive' : 'Archive'}
                        confirmStyle="default"
                        isLoading={isActionLoading}
                    />

                    <ConfirmationDialog
                        open={deleteDialog.open}
                        onClose={() => !isActionLoading && setDeleteDialog({ open: false, runsheetId: null })}
                        onConfirm={handleDelete}
                        title="Delete Runsheet"
                        message="Are you sure you want to delete this runsheet? This action cannot be undone."
                        confirmText="Delete"
                        confirmStyle="destructive"
                        isLoading={isActionLoading}
                    />

                    {/* Duplicate Runsheet Dialog */}
                    {duplicateDialog.open && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDuplicateDialog({ open: false, runsheet: null, copyCollaborators: false })} />
                            <div className="relative bg-card border border-border rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm flex flex-col gap-4">
                                <h2 className="text-base font-bold text-foreground">Duplicate Runsheet</h2>

                                {duplicateDialog.runsheet?.role === 'owner' || duplicateDialog.runsheet?.role === 'editor' ? (
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="mt-0.5 shrink-0">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-primary rounded"
                                                checked={duplicateDialog.copyCollaborators}
                                                onChange={(e) => setDuplicateDialog(d => ({ ...d, copyCollaborators: e.target.checked }))}
                                            />
                                        </div>
                                        <span className="text-sm text-foreground">Copy existing editors and viewers to the new duplicated runsheet.</span>
                                    </label>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        As you are not an owner or editor of the original runsheet, the existing users will not have access to the new duplicated runsheet until you share with them.
                                    </p>
                                )}

                                <div className="flex gap-2 justify-end mt-2">
                                    <button
                                        onClick={() => setDuplicateDialog({ open: false, runsheet: null, copyCollaborators: false })}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => duplicateRunsheet(duplicateDialog.runsheet, duplicateDialog.copyCollaborators)}
                                        disabled={isActionLoading}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                                    >
                                        {isActionLoading ? 'Duplicating…' : 'Create Duplicate'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <GroupDialog
                        open={groupDialog.open}
                        onClose={() => !isActionLoading && setGroupDialog({ open: false, runsheet: null })}
                        existingGroups={groups.filter(g => g.archived !== true)}
                        onSetGroup={(groupId) => {
                            handleSetGroup(groupDialog.runsheet?.id, groupId);
                        }}
                        onCreateGroup={handleCreateGroup}
                        currentGroupId={groupDialog.runsheet?.groupId}
                        isLoading={isActionLoading}
                    />

                    <ConfirmationDialog
                        open={removeFromGroupDialog.open}
                        onClose={() => !isActionLoading && setRemoveFromGroupDialog({ open: false, runsheet: null })}
                        onConfirm={handleRemoveFromGroup}
                        title="Remove from Group"
                        message={`Are you sure you want to remove "${removeFromGroupDialog.runsheet?.name}" from its group?`}
                        confirmText="Remove"
                        confirmStyle="default"
                        isLoading={isActionLoading}
                    />

                    <ConfirmationDialog
                        open={deleteGroupDialog.open}
                        onClose={() => !isActionLoading && setDeleteGroupDialog({ open: false, group: null })}
                        onConfirm={handleDeleteGroup}
                        title="Delete Group"
                        message={deleteGroupDialog.group && runsheets.some(r => r.groupId === deleteGroupDialog.group.id)
                            ? `This group is not empty. Are you sure you want to delete this group? Runsheets in this group will not be deleted.`
                            : `Are you sure you want to delete the group "${deleteGroupDialog.group?.name}"? This action cannot be undone.`}
                        confirmText="Delete"
                        confirmStyle="destructive"
                        isLoading={isActionLoading}
                    />

                    <ConfirmationDialog
                        open={notOwnerInfoDialog}
                        onClose={() => setNotOwnerInfoDialog(false)}
                        onConfirm={() => setNotOwnerInfoDialog(false)}
                        title="Group Ownership"
                        message="You are not the owner of the group. Only owners can edit and delete groups."
                        confirmText="OK"
                        confirmStyle="default"
                        showCancel={false}
                    />

                    <ShareGroupDialog
                        open={shareGroupDialog.open}
                        onClose={() => setShareGroupDialog({ open: false, group: null })}
                        group={shareGroupDialog.group}
                    />

                    <ShareDialog
                        open={shareDialog.open}
                        onClose={() => setShareDialog({ open: false, runsheetId: null, runsheetName: null })}
                        runsheetId={shareDialog.runsheetId}
                        runsheetName={shareDialog.runsheetName}
                    />

                    <WhatsNewDialog
                        open={whatsNewDialog}
                        onClose={() => setWhatsNewDialog(false)}
                    />

                    {/* Rename Group Modal */}
                    {renameGroupDialog.open && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !groupActionLoading && setRenameGroupDialog({ open: false, groupId: null, currentName: '' })}>
                            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                                <h2 className="text-xl font-extrabold tracking-tight mb-1">Rename Group</h2>
                                <p className="text-sm text-muted-foreground mb-4">Enter a new name for this group.</p>
                                <input
                                    autoFocus
                                    type="text"
                                    value={renameGroupInput}
                                    onChange={e => setRenameGroupInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleRenameGroup()}
                                    disabled={groupActionLoading}
                                    className="w-full h-11 px-3 rounded-xl border border-border bg-muted/40 text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                                    placeholder="Group name"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRenameGroupDialog({ open: false, groupId: null, currentName: '' })}
                                        disabled={groupActionLoading}
                                        className="flex-1 h-10 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRenameGroup}
                                        disabled={groupActionLoading || !renameGroupInput.trim()}
                                        className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {groupActionLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Archive Group Confirmation */}
                    {archiveGroupDialog.open && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setArchiveGroupDialog({ open: false, groupId: null })}>
                            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-destructive/10 mb-4">
                                    <span className="material-symbols-outlined text-2xl text-destructive">inventory_2</span>
                                </div>
                                <h2 className="text-xl font-extrabold tracking-tight mb-2">Archive Group?</h2>
                                <p className="text-sm text-muted-foreground mb-6">All runsheets in this group will be archived and the group name will be hidden for all users. Are you sure?</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleArchiveGroup}
                                        disabled={groupActionLoading}
                                        className="w-full h-11 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {groupActionLoading ? 'Archiving...' : 'Archive Group'}
                                    </button>
                                    <button
                                        onClick={() => setArchiveGroupDialog({ open: false, groupId: null })}
                                        className="w-full h-11 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Unarchive Group Confirmation */}
                    {unarchiveGroupDialog.open && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setUnarchiveGroupDialog({ open: false, groupId: null })}>
                            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
                                    <span className="material-symbols-outlined text-2xl text-primary">unarchive</span>
                                </div>
                                <h2 className="text-xl font-extrabold tracking-tight mb-2">Unarchive Group?</h2>
                                <p className="text-sm text-muted-foreground mb-6">All runsheets in this group will be unarchived and visible again. Are you sure?</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleUnarchiveGroup}
                                        disabled={groupActionLoading}
                                        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {groupActionLoading ? 'Unarchiving...' : 'Unarchive Group'}
                                    </button>
                                    <button
                                        onClick={() => setUnarchiveGroupDialog({ open: false, groupId: null })}
                                        className="w-full h-11 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Blocked Archive Dialog */}
                    {blockedArchiveDialog && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setBlockedArchiveDialog(false)}>
                            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
                                    <span className="material-symbols-outlined text-2xl text-primary">info</span>
                                </div>
                                <h2 className="text-xl font-extrabold tracking-tight mb-2">Archive Group Instead?</h2>
                                <p className="text-sm text-muted-foreground mb-6">Runsheets in groups cannot be archived individually. Archive the whole group instead.</p>
                                <button
                                    onClick={() => setBlockedArchiveDialog(false)}
                                    className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
                                >
                                    Got it
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Migration Upgrade Modal */}
                    {migrationState.total > 0 && (migrationState.status === 'migrating' || migrationState.status === 'completed') && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                            <div className="relative w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-300">
                                {/* Animated Icon */}
                                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    {migrationState.status === 'completed' ? (
                                        <span className="material-symbols-outlined text-4xl text-success animate-bounce">check_circle</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-4xl text-primary animate-spin">upgrade</span>
                                    )}
                                </div>

                                {/* Title and details */}
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black text-foreground">System Upgrade</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        We are upgrading all your old runsheets. This is only performed once. Please wait...
                                    </p>
                                </div>

                                {/* Progress bar container */}
                                <div className="w-full space-y-2">
                                    <div className="flex justify-between text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        <span>Progress</span>
                                        <span>{migrationState.migrated} / {migrationState.total}</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden border border-border/20">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${(migrationState.migrated / migrationState.total) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Done Button */}
                                <button
                                    disabled={migrationState.status !== 'completed'}
                                    onClick={() => setMigrationState(prev => ({ ...prev, status: 'none' }))}
                                    className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 border border-primary/10"
                                >
                                    {migrationState.status === 'completed' ? 'Done' : 'Upgrading...'}
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Floating Group Enrollment success toast */}
                    {showGroupToast && (
                        <div 
                            onClick={() => setShowGroupToast(false)}
                            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 animate-in fade-in slide-in-from-top-4 duration-300 cursor-pointer"
                        >
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-semibold shadow-xl backdrop-blur bg-background/95">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                <span>Group saved to your runsheet list!</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
