'use client';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import moment from 'moment';
import RunsheetMetadataDialog from './RunsheetMetadataDialog';
import ConfirmationDialog from '../ConfirmationDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export default function RunsheetList() {
    const { user, logOut } = useAuth();
    const [runsheets, setRunsheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // legacy filter state, mostly unused now
    const [theme, setTheme] = useState('light'); // 'light' or 'dark'

    // Tab State
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'archive'

    // Sort order
    const [sortOrder, setSortOrder] = useState('asc'); // Default to Oldest to Latest (Upcoming)
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [metadataDialog, setMetadataDialog] = useState({ open: false, data: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, runsheetId: null });

    // Update default sort order when tab changes
    useEffect(() => {
        if (activeTab === 'upcoming') {
            setSortOrder('asc');
        } else {
            setSortOrder('desc');
        }
    }, [activeTab]);

    useEffect(() => {
        // Initialize theme from localStorage or system preference
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            setTheme(storedTheme);
            if (storedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const fetchRunsheets = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (!user.email) {
                setLoading(false);
                return;
            }

            const userRunsheetsRef = collection(db, `users/${user.email}/runsheets`);
            const q = query(userRunsheetsRef);

            const snapshot = await getDocs(q);
            const runsheetPromises = snapshot.docs.map(async (userDoc) => {
                const runsheetDocRef = doc(db, 'runsheets', userDoc.id);
                try {
                    const runsheetSnap = await getDoc(runsheetDocRef);
                    if (runsheetSnap.exists()) {
                        const data = runsheetSnap.data();
                        return {
                            id: runsheetSnap.id,
                            ...data,
                            category: data.category || 'active'
                        };
                    }
                } catch (e) {
                    console.error("Error fetching runsheet", userDoc.id, e);
                }
                return null;
            });

            const results = await Promise.all(runsheetPromises);
            const validRunsheets = results.filter(r => r !== null);
            // Default sort: Upcoming (Ascending)
            validRunsheets.sort((a, b) => new Date(a.date) - new Date(b.date));

            setRunsheets(validRunsheets);
        } catch (error) {
            console.error("Error fetching runsheets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRunsheets();
    }, [user]);

    const handleCreateOrUpdate = async (formData) => {
        try {
            if (!user?.email) return;

            if (metadataDialog.data) {
                // UPDATE
                const runsheetRef = doc(db, 'runsheets', metadataDialog.data.id);
                await updateDoc(runsheetRef, {
                    name: formData.name,
                    date: formData.date,
                    time: formData.time,
                    lastUpdated: moment().format()
                });
            } else {
                // CREATE
                const newRunsheet = {
                    name: formData.name,
                    date: formData.date,
                    time: formData.time,
                    orderCount: 0,
                    lastUpdated: moment().format(),
                    category: 'active'
                };

                const docRef = await addDoc(collection(db, 'runsheets'), newRunsheet);
                await setDoc(doc(db, `users/${user.email}/runsheets`, docRef.id), { id: docRef.id });
                await setDoc(doc(db, `runsheets/${docRef.id}/users`, user.email), {
                    id: user.email,
                    role: 'editor',
                    email: user.email
                });
            }

            setMetadataDialog({ open: false, data: null });
            fetchRunsheets();
        } catch (err) {
            console.error("Error saving runsheet", err);
        }
    };

    const duplicateRunsheet = async (runsheet) => {
        // Keeping logic but not exposing in UI for now unless I add a context menu
        // Plan: Add a simple long-press or "More" icon if possible.
        // For this step, I'll focus on the visual match first.
        try {
            setLoading(true);
            const q = query(collection(db, `runsheets/${runsheet.id}/programme`), orderBy('orderCount', 'asc'));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => doc.data());

            const newRunsheet = {
                ...runsheet,
                name: `Copy of ${runsheet.name}`,
                category: 'active',
                lastUpdated: moment().format()
            };
            delete newRunsheet.id;

            const newDocRef = await addDoc(collection(db, 'runsheets'), newRunsheet);

            await setDoc(doc(db, `users/${user.email}/runsheets`, newDocRef.id), { id: newDocRef.id });
            await setDoc(doc(db, `runsheets/${newDocRef.id}/users`, user.email), {
                id: user.email,
                role: 'editor',
                email: user.email
            });

            const batch = writeBatch(db);
            items.forEach((item) => {
                const itemRef = doc(collection(db, `runsheets/${newDocRef.id}/programme`));
                batch.set(itemRef, item);
            });
            await batch.commit();

            fetchRunsheets();
        } catch (err) {
            console.error("Error duplicating runsheet", err);
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.runsheetId) return;
        try {
            await deleteDoc(doc(db, 'runsheets', deleteDialog.runsheetId));
            setRunsheets(prev => prev.filter(r => r.id !== deleteDialog.runsheetId));
            setDeleteDialog({ open: false, runsheetId: null });
        } catch (err) {
            console.error("Error deleting runsheet", err);
        }
    };

    // Helper to group runsheets
    const groupRunsheets = (data) => {
        const groups = {};
        data.forEach(item => {
            const m = moment(item.date);
            const key = m.format('MMM YYYY');
            const sortKey = m.format('YYYY-MM'); // used for sorting groups if needed
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    };

    // helper to render list
    const renderRunsheetList = (listData) => {
        // filter by search
        const searched = listData.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

        // sort
        searched.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        const grouped = groupRunsheets(searched);
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            const dateA = moment(a, 'MMM YYYY').toDate();
            const dateB = moment(b, 'MMM YYYY').toDate();
            // Group sorting usually follows the general sort order to keep visual consistency, 
            // OR it always follows chronological order. 
            // Let's make it follow sortOrder so "Latest" shows Dec before Jan.
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        if (searched.length === 0) {
            return (
                <div className="p-8 text-center text-text-secondary">
                    No runsheets found.
                </div>
            );
        }

        return sortedKeys.map(groupKey => (
            <div key={groupKey} className="flex flex-col">
                <div className="px-6 py-4 bg-gray-50 dark:bg-surface-dark/50 border-b border-divider dark:border-divider-dark sticky top-[138px] z-10 backdrop-blur-sm">
                    <h2 className="text-xs font-bold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">{groupKey}</h2>
                </div>
                {grouped[groupKey].map(runsheet => {
                    const dateObj = moment(runsheet.date);
                    const niceDate = dateObj.format('D');
                    const dayName = dateObj.format('ddd');
                    const monthShort = dateObj.format('MMM');

                    return (
                        <div key={runsheet.id} className="group flex w-full text-left focus:outline-none border-b border-divider dark:border-divider-dark hover:bg-gray-50 dark:hover:bg-surface-dark transition-colors">
                            <Link href={`/runsheet/${runsheet.id}`} className="flex-1 flex items-start px-6 py-5 active:bg-blue-50 dark:active:bg-blue-900/10 transition-colors">
                                <div className="flex flex-col items-center w-14 shrink-0 mr-4 pt-0.5">
                                    <span className="text-[11px] font-bold text-primary-custom dark:text-blue-400 uppercase tracking-wide">{dayName}</span>
                                    <span className="text-3xl font-extrabold text-primary-custom dark:text-blue-400 leading-none mt-0.5">{niceDate}</span>
                                    <span className="text-[10px] font-semibold text-text-secondary dark:text-text-secondary-dark uppercase mt-1">{monthShort}</span>
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1.5 line-clamp-2 group-hover:text-primary-custom dark:group-hover:text-blue-400 transition-colors">
                                        {runsheet.name}
                                    </h3>
                                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark truncate">
                                        Last updated {moment(runsheet.lastUpdated).fromNow()}
                                    </p>
                                </div>
                            </Link>
                            <div className="flex items-center justify-center px-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex size-10 items-center justify-center rounded-full text-text-secondary dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-white/10 transition-colors active:scale-90">
                                            <span className="material-symbols-outlined text-xl">more_vert</span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setMetadataDialog({ open: true, data: runsheet })}>
                                            Edit Name & Date
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    );
                })}
            </div>
        ));
    };

    // Filter Logic
    const today = moment().startOf('day');

    const upcomingRunsheets = runsheets.filter(r => {
        // Not archive AND date >= today
        // treat 'active' category (or undefined/null) as active
        if (r.category === 'archive') return false;
        const rDate = moment(r.date).startOf('day'); // normalize runsheet date to start of day
        return rDate.isSameOrAfter(today);
    });

    const pastRunsheets = runsheets.filter(r => {
        // Not archive AND date < today
        if (r.category === 'archive') return false;
        const rDate = moment(r.date).startOf('day');
        return rDate.isBefore(today);
    });

    const archivedRunsheets = runsheets.filter(r => r.category === 'archive');


    const DesktopSidebar = () => (
        <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-surface-dark/30 pt-4 pb-4 justify-between h-screen sticky top-0">
            <div className="px-6">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Runsheets</h1>
            </div>

            <div className="flex flex-col gap-2 px-4 pb-4">
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                    onClick={logOut}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-destructive hover:bg-destructive/10 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Log Out
                </button>
            </div>
        </aside>
    );

    return (
        <div className="relative flex h-full min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display">

            <DesktopSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full">
                <div className="w-full mx-auto pb-24 md:pb-12 shadow-2xl md:shadow-none bg-background-light dark:bg-background-dark md:bg-transparent border-x border-divider dark:border-divider-dark md:border-none relative">

                    {/* Header */}
                    <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl px-4 pt-10 pb-2 transition-all md:pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="md:hidden">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark text-slate-900 dark:text-text-primary-dark transition-all active:scale-95">
                                            <span className="material-symbols-outlined text-2xl">menu</span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer flex items-center justify-between">
                                            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                            <span className="material-symbols-outlined text-sm">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive cursor-pointer flex items-center justify-between">
                                            <span>Log Out</span>
                                            <span className="material-symbols-outlined text-sm">logout</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Spacer for desktop alignment if needed, or just justify-end */}
                            <div className="hidden md:block"></div>

                            <div className="flex items-center gap-2">
                                {/* Sort Menu */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark text-slate-600 dark:text-text-secondary-dark transition-colors active:scale-95">
                                            <span className="material-symbols-outlined text-2xl">swap_vert</span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSortOrder('desc')} className="flex items-center justify-between cursor-pointer">
                                            <span>Latest to oldest</span>
                                            {sortOrder === 'desc' && <span className="material-symbols-outlined text-sm">check</span>}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortOrder('asc')} className="flex items-center justify-between cursor-pointer">
                                            <span>Oldest to latest</span>
                                            {sortOrder === 'asc' && <span className="material-symbols-outlined text-sm">check</span>}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Search Toggle */}
                                <button
                                    onClick={() => {
                                        setShowSearch(!showSearch);
                                        if (showSearch) setSearchQuery(''); // Clear on close?
                                    }}
                                    className={`flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark text-slate-600 dark:text-text-secondary-dark transition-colors active:scale-95 ${showSearch ? 'bg-gray-100 dark:bg-surface-dark text-primary-custom dark:text-blue-400' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-2xl">search</span>
                                </button>
                            </div>
                        </div>
                        <div className="px-2 pb-2 h-14 flex items-center">
                            {showSearch ? (
                                <div className="w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <Input
                                        autoFocus
                                        placeholder="Search runsheets..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-surface-dark border-transparent focus:border-primary-custom dark:focus:border-blue-500 rounded-xl h-12 text-lg"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <h1 className="md:hidden text-[32px] leading-tight font-extrabold tracking-tight text-slate-900 dark:text-white animate-in fade-in slide-in-from-left-2 duration-200">Runsheets</h1>
                                    {/* Desktop Title shown in Sidebar, but maybe nice here too? User said keep tabs top. Let's hide title on desktop as it's in sidebar now */}
                                    <h1 className="hidden md:block text-[32px] leading-tight font-extrabold tracking-tight text-slate-900 dark:text-white animate-in fade-in slide-in-from-left-2 duration-200">Runsheets</h1>
                                    <p className="hidden text-text-secondary dark:text-text-secondary-dark text-sm font-medium mt-1">Manage your upcoming events</p>
                                </div>
                            )}
                        </div>
                        <div className="px-4 pb-4 w-full">
                            <div className="flex items-center justify-center gap-1 p-1 rounded-full bg-gray-100 dark:bg-surface-dark border border-gray-200 dark:border-white/5 shadow-sm w-full max-w-md mx-auto">
                                {['upcoming', 'past', 'archive'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`
                                            flex-1 px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all
                                            ${activeTab === tab
                                                ? 'bg-white dark:bg-surface-highlight text-primary-custom dark:text-blue-400 shadow-sm'
                                                : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
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
                    <main className="flex-1 flex flex-col pb-24 md:pb-12">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center mt-20 gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-custom"></div>
                            </div>
                        ) : (
                            <div className="w-full flex-1 flex flex-col">


                                <div className="flex-1 mt-0">
                                    {activeTab === 'upcoming' && renderRunsheetList(upcomingRunsheets)}
                                    {activeTab === 'past' && renderRunsheetList(pastRunsheets)}
                                    {activeTab === 'archive' && renderRunsheetList(archivedRunsheets)}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* FAB */}
                    <button
                        onClick={() => setMetadataDialog({ open: true, data: null })}
                        className="fixed bottom-8 right-8 md:bottom-12 md:right-12 h-14 w-14 rounded-2xl bg-primary-custom dark:bg-blue-500 shadow-xl shadow-blue-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all z-50"
                    >
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </button>

                    {/* Hidden Dialogs required for logic */}
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
                        message="Are you sure you want to delete this runsheet?"
                    />
                </div>
            </div>
        </div>
    );
}
