'use client';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import moment from 'moment';
import dynamic from 'next/dynamic';

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


import { useDashboard } from '../../context/DashboardContext';

export default function RunsheetList({ initialFilter = 'upcoming' }) {
    const { user, logOut } = useAuth();
    const router = useRouter();
    const { 
        runsheets, setRunsheets, 
        groups, setGroups, 
        loading, setLoading, 
        isSyncing, setIsSyncing, 
        activeFilter, setActiveFilter,
        refresh
    } = useDashboard();

    const [theme, setTheme] = useState('dark');

    // Sync initialFilter prop to context once on mount or if prop changes
    useEffect(() => {
        if (initialFilter && initialFilter !== activeFilter) {
            setActiveFilter(initialFilter);
        }
    }, [initialFilter, activeFilter, setActiveFilter]);

    // Sort order
    const [sortOrder, setSortOrder] = useState('asc');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [metadataDialog, setMetadataDialog] = useState({ open: false, data: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, runsheetId: null });
    const [groupDialog, setGroupDialog] = useState({ open: false, runsheet: null });
    const [shareGroupDialog, setShareGroupDialog] = useState({ open: false, group: null });

    // Update default sort order when filter changes
    useEffect(() => {
        const isDesc = activeFilter === 'past' || activeFilter === 'archive';
        setSortOrder(isDesc ? 'desc' : 'asc');
    }, [activeFilter]);

    // Navigate to filter: only push URL, don't update state manually here to prevent double hits
    const navigateToFilter = (filter) => {
        if (filter === activeFilter) return;
        
        if (filter === 'upcoming') router.replace('/upcoming');
        else if (filter === 'past') router.replace('/past');
        else if (filter === 'archive') router.replace('/archive');
        else router.replace(`/group/${filter}`);
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
            setIsSyncing(true);
            if (metadataDialog.data) {
                const runsheetRef = doc(db, 'runsheets', metadataDialog.data.id);
                await updateDoc(runsheetRef, { name: formData.name, date: formData.date, time: formData.time, lastUpdated: moment().format() });
            } else {
                const isGroup = activeFilter && !['upcoming', 'past', 'archive'].includes(activeFilter);
                const newRunsheet = { 
                    name: formData.name, 
                    date: formData.date, 
                    time: formData.time, 
                    orderCount: 0, 
                    lastUpdated: moment().format(), 
                    category: 'active',
                    groupId: isGroup ? activeFilter : null
                };
                const docRef = await addDoc(collection(db, 'runsheets'), newRunsheet);
                await setDoc(doc(db, `users/${user.email}/runsheets`, docRef.id), { id: docRef.id });
                await setDoc(doc(db, `runsheets/${docRef.id}/users`, user.email), {
                    id: user.email,
                    role: 'owner',
                    email: user.email
                });
            }
            setMetadataDialog({ open: false, data: null });
            await refresh();
        } catch (err) {
            console.error("Error saving runsheet", err);
        } finally {
            setIsSyncing(false);
        }
    };


    const handleCreateGroup = async (name) => {
        try {
            const groupRef = await addDoc(collection(db, 'groups'), {
                name,
                createdBy: user.email,
                createdAt: moment().format()
            });
            await refresh();
            return groupRef.id;
        } catch (err) {
            console.error("Error creating group", err);
            throw err;
        }
    };



    const handleSetGroup = async (runsheetId, groupId) => {
        try {
            setIsSyncing(true);
            await updateDoc(doc(db, 'runsheets', runsheetId), { groupId });
            await refresh();
        } catch (err) {
            console.error("Error setting group", err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRemoveFromGroup = async (runsheetId) => {
        try {
            setIsSyncing(true);
            await updateDoc(doc(db, 'runsheets', runsheetId), { groupId: null });
            await refresh();
        } catch (err) {
            console.error("Error removing from group", err);
        } finally {
            setIsSyncing(false);
        }
    };

    const duplicateRunsheet = async (runsheet) => {
        try {
            setIsSyncing(true);
            const q = query(collection(db, `runsheets/${runsheet.id}/programme`), orderBy('orderCount', 'asc'));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => doc.data());
            const newRunsheet = { ...runsheet, name: `Copy of ${runsheet.name}`, category: 'active', lastUpdated: moment().format() };
            delete newRunsheet.id;
            const newDocRef = await addDoc(collection(db, 'runsheets'), newRunsheet);
            await setDoc(doc(db, `users/${user.email}/runsheets`, newDocRef.id), { id: newDocRef.id });
            await setDoc(doc(db, `runsheets/${newDocRef.id}/users`, user.email), {
                id: user.email,
                role: 'owner',
                email: user.email
            });
            const batch = writeBatch(db);
            items.forEach((item) => { batch.set(doc(collection(db, `runsheets/${newDocRef.id}/programme`)), item); });
            await batch.commit();
            await refresh();
        } catch (err) {
            console.error("Error duplicating runsheet", err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.runsheetId) return;
        try {
            setIsSyncing(true);
            await deleteDoc(doc(db, 'runsheets', deleteDialog.runsheetId));
            setRunsheets(prev => prev.filter(r => r.id !== deleteDialog.runsheetId));
            setDeleteDialog({ open: false, runsheetId: null });
        } catch (err) {
            console.error('Error deleting runsheet', err);
        } finally {
            setIsSyncing(false);
        }
    };

    // Bug 1: Archive / Unarchive
    const handleArchiveToggle = async (runsheet) => {
        const newCategory = runsheet.category === 'archive' ? 'active' : 'archive';
        // Optimistic update
        setRunsheets(prev => prev.map(r => r.id === runsheet.id ? { ...r, category: newCategory } : r));
        try {
            setIsSyncing(true);
            await updateDoc(doc(db, 'runsheets', runsheet.id), { category: newCategory });
        } catch (err) {
            console.error('Error updating category', err);
            // Rollback on failure
            setRunsheets(prev => prev.map(r => r.id === runsheet.id ? { ...r, category: runsheet.category } : r));
        } finally {
            setIsSyncing(false);
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
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
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
                        {isSyncing ? 'Loading runsheet group...' : 'No runsheets found'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isSyncing ? 'We are checking for the latest updates in this group.' : 'Create a new runsheet to get started.'}
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
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap overflow-hidden">
                                                        {runsheet.groupId && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    navigateToFilter(runsheet.groupId);
                                                                }}
                                                                className="px-1.5 py-0.5 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase transition-colors whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]"
                                                                title={`Go to group: ${groups.find(g => g.id === runsheet.groupId)?.name || 'Group'}`}
                                                            >
                                                                {groups.find(g => g.id === runsheet.groupId)?.name || 'Group'}
                                                            </button>
                                                        )}
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            Last updated {moment(runsheet.lastUpdated).fromNow()}
                                                        </span>
                                                        {!runsheet.isEditor && (
                                                            <div className="flex items-center text-muted-foreground ml-0.5" title="Shared with me">
                                                                <span className="material-symbols-outlined text-[18px]">folder_shared</span>
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
                                                <DropdownMenuContent align="end" className="w-48">
                                                    {runsheet.isEditor && (
                                                        <DropdownMenuItem onClick={() => setMetadataDialog({ open: true, data: runsheet })}>
                                                            <span className="material-symbols-outlined text-base mr-2">edit</span>
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => duplicateRunsheet(runsheet)}>
                                                        <span className="material-symbols-outlined text-base mr-2">content_copy</span>
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    {runsheet.isEditor && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setGroupDialog({ open: true, runsheet })}>
                                                                <span className="material-symbols-outlined text-base mr-2">folder_open</span>
                                                                {runsheet.groupId ? 'Move to another group' : 'Add to Group'}
                                                            </DropdownMenuItem>
                                                            {runsheet.groupId && (
                                                                <DropdownMenuItem onClick={() => handleRemoveFromGroup(runsheet.id)}>
                                                                    <span className="material-symbols-outlined text-base mr-2">folder_off</span>
                                                                    Remove from Group
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleArchiveToggle(runsheet)}>
                                                                <span className="material-symbols-outlined text-base mr-2">{runsheet.category === 'archive' ? 'unarchive' : 'archive'}</span>
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

    const groupRunsheetsList = activeFilter && activeFilter !== 'upcoming' && activeFilter !== 'past' && activeFilter !== 'archive'
        ? runsheets.filter(r => r.groupId === activeFilter && r.category !== 'archive')
        : [];

    const tabCounts = {
        upcoming: upcomingRunsheets.length,
        past: pastRunsheets.length,
        archive: archivedRunsheets.length,
        ...Object.fromEntries(groups.map(g => [g.id, runsheets.filter(r => r.groupId === g.id && r.category !== 'archive' && (moment(r.date).isSameOrAfter(today) || moment(r.date).isAfter(moment().subtract(7, 'days')))).length]))
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
                    {groups.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-6 px-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">My Groups</p>
                            {groups.map(group => (
                                <button
                                    key={group.id}
                                    onClick={() => navigateToFilter(group.id)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                                        ${activeFilter === group.id
                                            ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }
                                    `}
                                >
                                    <span className={`material-symbols-outlined text-[20px] ${activeFilter === group.id ? 'icon-filled' : ''}`}>folder</span>
                                    <span className="truncate flex-1 text-left">{group.name}</span>
                                    {tabCounts[group.id] > 0 && (
                                        <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${activeFilter === group.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            {tabCounts[group.id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

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
                <div className="flex flex-col gap-1 px-4">
                    <div className="border-t border-border pt-4 mb-2"></div>
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    {/* User profile */}
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all w-full text-left">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                                        <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">{user.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate flex-1">{user.displayName}</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="top" className="w-52">
                                <DropdownMenuItem disabled className="text-xs text-muted-foreground">{user.email}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive">
                                    <span className="material-symbols-outlined text-base mr-2">logout</span>
                                    Log Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
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
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reloading groups...</span>
                        </div>
                    </>
                )}
                <div className="w-full max-w-5xl mx-auto pb-28 md:pb-12 relative">

                    {/* Header */}
                    <header className="sticky top-0 z-50 bg-background border-b border-border/30 md:pl-8 md:pr-8">
                        <div className="px-4 md:px-0 pt-4 pb-2">
                            {/* Top bar */}
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

                            {/* Title or Search */}
                            <div className="min-h-[48px] flex items-center">
                                {showSearch ? (
                                    <div className="w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Input
                                            autoFocus
                                            placeholder="Search runsheets..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-muted/60 border-transparent focus:border-primary rounded-xl h-11 text-base"
                                        />
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                                            {activeFilter === 'upcoming' ? 'Upcoming' :
                                                activeFilter === 'past' ? 'Past' :
                                                    activeFilter === 'archive' ? 'Archive' :
                                                        groups.find(g => g.id === activeFilter)?.name || 'Group'}
                                        </h1>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tab Pills — Mobile only */}
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
                                {groups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => navigateToFilter(group.id)}
                                        className={`
                                            px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200 whitespace-nowrap border
                                            ${activeFilter === group.id
                                                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                                : 'bg-muted/80 border-border/40 text-muted-foreground hover:text-foreground'
                                            }
                                        `}
                                    >
                                        {group.name}
                                        {tabCounts[group.id] > 0 && (
                                            <span className={`ml-1.5 ${activeFilter === group.id ? 'text-primary-foreground/70' : 'text-muted-foreground/50'}`}>
                                                {tabCounts[group.id]}
                                            </span>
                                        )}
                                    </button>
                                ))}
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
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col mt-2 md:pl-8 md:pr-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center mt-24 gap-4 page-enter">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading runsheets...</p>
                            </div>
                        ) : (
                            <div className="w-full flex-1 flex flex-col">
                                {showSearch && searchQuery.trim()
                                    ? renderRunsheetList(runsheets)
                                    : activeFilter === 'upcoming' ? renderRunsheetList(upcomingRunsheets)
                                        : activeFilter === 'past' ? renderRunsheetList(pastRunsheets)
                                            : activeFilter === 'archive' ? renderRunsheetList(archivedRunsheets)
                                                : renderRunsheetList(groupRunsheetsList)
                                }
                            </div>
                        )}
                        {/* Share Group button — shown at bottom when viewing a group the user owns */}
                        {!loading && activeFilter && activeFilter !== 'upcoming' && activeFilter !== 'past' && activeFilter !== 'archive' && (() => {
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
                    <button
                        onClick={() => setMetadataDialog({ open: true, data: null })}
                        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 h-14 w-14 rounded-2xl bg-primary shadow-xl shadow-primary/25 flex items-center justify-center text-primary-foreground hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all duration-300 z-50 float-animation group"
                    >
                        <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform duration-300">add</span>
                    </button>

                    {/* Dialogs */}
                    <RunsheetMetadataDialog
                        open={metadataDialog.open}
                        onClose={() => setMetadataDialog({ open: false, data: null })}
                        onSubmit={handleCreateOrUpdate}
                        initialData={metadataDialog.data}
                    />

                    <ConfirmationDialog
                        open={deleteDialog.open}
                        onClose={() => setDeleteDialog({ open: false, runsheetId: null })}
                        onConfirm={handleDelete}
                        title="Delete Runsheet"
                        message="Are you sure you want to delete this runsheet? This action cannot be undone."
                        confirmText="Delete"
                        confirmStyle="destructive"
                        isLoading={isSyncing}
                    />

                    <GroupDialog
                        open={groupDialog.open}
                        onClose={() => setGroupDialog({ open: false, runsheet: null })}
                        existingGroups={groups}
                        onSetGroup={(groupId) => handleSetGroup(groupDialog.runsheet?.id, groupId)}
                        onCreateGroup={handleCreateGroup}
                        currentGroupId={groupDialog.runsheet?.groupId}
                    />

                    <ShareGroupDialog
                        open={shareGroupDialog.open}
                        onClose={() => setShareGroupDialog({ open: false, group: null })}
                        group={shareGroupDialog.group}
                    />
                </div>
            </div>
        </div>
    );
}
