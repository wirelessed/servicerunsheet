'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArticleIcon from '@mui/icons-material/Description';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import ShareIcon from '@mui/icons-material/Share';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay';
import dynamic from 'next/dynamic';

import UpdateIcon from '@mui/icons-material/Update';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';

import moment from 'moment';
import { doc, updateDoc, writeBatch, collection, addDoc, deleteDoc, getDoc, deleteField } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import ItemDialog from './ItemDialog';
import ShareTab from './ShareTab';
import RunsheetMetadataDialog from './RunsheetMetadataDialog';
import NotesTab from './NotesTab';
import ConfirmationDialog from '../ConfirmationDialog';

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useRouter } from 'next/navigation';

const AdvancedGrid = dynamic(() => import('./AdvancedGrid'), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-card rounded-xl border border-border/50 animate-pulse text-muted-foreground"><span className="material-symbols-outlined text-4xl mb-4 p-4 bg-muted rounded-full">grid_on</span></div> });

export default function RunsheetEditor({ runsheet, initialProgramme, programmeLoading = false, isAuthenticated = true }) {
    const { user } = useAuth();
    const { runsheets, groups, activeFilter, setActiveFilter } = useDashboard();
    const router = useRouter();
    const [items, setItems] = useState(initialProgramme);
    const [timings, setTimings] = useState({});
    const [originalTimings, setOriginalTimings] = useState({});
    const [theme, setTheme] = useState('dark');
    const [now, setNow] = useState(moment());
    const [clock, setClock] = useState(moment());
    const [isEditor, setIsEditor] = useState(false);
    const [userRole, setUserRole] = useState(null); // 'owner' | 'editor' | 'ops' | 'viewer' | null

    // Guests (unauthenticated) are always read-only
    const effectiveIsEditor = isAuthenticated && isEditor;
    const isOps = isAuthenticated && userRole === 'ops';

    // UI States
    const [mode, setMode] = useState('view'); // 'view', 'edit', 'reorder', 'ops'
    const [activeTab, setActiveTab] = useState('runsheet'); // 'runsheet', 'notes', 'share'
    const [isListSidebarOpen, setIsListSidebarOpen] = useState(true);
    const [isSidebarInitialized, setIsSidebarInitialized] = useState(false);
    const effectiveListSidebarOpen = user ? isListSidebarOpen : false;
    const [isDragging, setIsDragging] = useState(false);
    const [hasEntered, setHasEntered] = useState(false);

    useEffect(() => {
        setHasEntered(false);
    }, [activeTab, mode, runsheet?.id]);

    useEffect(() => {
        const savedState = localStorage.getItem('runsheetListSidebarOpen');
        if (savedState !== null) {
            setIsListSidebarOpen(savedState === 'true');
        }
        setIsSidebarInitialized(true);
    }, []);

    useEffect(() => {
        if (isSidebarInitialized) {
            localStorage.setItem('runsheetListSidebarOpen', isListSidebarOpen);
        }
    }, [isListSidebarOpen, isSidebarInitialized]);
    const [fromGroup, setFromGroup] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('fromGroup') === 'true') {
                setFromGroup(true);
            }
        }
    }, []);
    // Dialogs
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState({ open: false, itemId: null });
    // Ops: log missed transition dialog
    const [logMissedDialog, setLogMissedDialog] = useState({ open: false, itemId: null, itemLabel: '' });
    const [logMissedTime, setLogMissedTime] = useState('');
    // Ops: toast
    const [opsToast, setOpsToast] = useState(null); // { message, onUndo }
    const opsToastTimerRef = useRef(null);

    const calculateTimings = useCallback((programmeItems, startTimeStr) => {
        const dateStr = runsheet.date ? runsheet.date.split('T')[0] : moment().format('YYYY-MM-DD');
        let currentTime = moment(`${dateStr} ${startTimeStr}`, "YYYY-MM-DD HHmm");
        let origCurrentTime = moment(`${dateStr} ${startTimeStr}`, "YYYY-MM-DD HHmm");

        const newTimings = {};
        const newOrigTimings = {};

        programmeItems.forEach(item => {
            newTimings[item.id] = {
                start: currentTime.format("h:mm"),
                amPm: currentTime.format("A"),
                obj: currentTime.clone()
            };
            const duration = parseInt(item.duration) || 0;
            currentTime.add(duration, 'minutes');

            newOrigTimings[item.id] = {
                start: origCurrentTime.format("h:mm"),
                amPm: origCurrentTime.format("A"),
                obj: origCurrentTime.clone()
            };
            const origDuration = item.originalDuration !== undefined ? parseInt(item.originalDuration) : duration;
            origCurrentTime.add(origDuration, 'minutes');
        });
        setTimings(newTimings);
        setOriginalTimings(newOrigTimings);
    }, [runsheet.date]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(initialProgramme);
        calculateTimings(initialProgramme, runsheet.time);
    }, [initialProgramme, runsheet.time, calculateTimings]);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!user?.email) { setIsEditor(false); setUserRole(null); return; }
            try {
                const userRef = doc(db, `runsheets/${runsheet.id}/users`, user.email);
                const userSnap = await getDoc(userRef);
                const role = userSnap.exists() ? userSnap.data().role : null;
                setUserRole(role);
                // owner and editor both count as having edit access
                if (role === 'editor' || role === 'owner') {
                    setIsEditor(true);
                } else if (role === 'ops') {
                    setIsEditor(false);
                    setMode('ops'); // auto-enter ops mode for ops users
                } else {
                    setIsEditor(false);
                    setMode('view');
                }
            } catch (error) {
                console.error("Error checking permissions:", error);
                setIsEditor(false);
                setUserRole(null);
            }
        };
        checkPermissions();
    }, [user, runsheet.id]);

    useEffect(() => {
        const interval = setInterval(() => setNow(moment()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setClock(moment()), 1000);
        return () => clearInterval(interval);
    }, []);

    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const onDragStart = () => {
        setIsDragging(true);
    };

    const onDragEnd = async (result) => {
        setIsDragging(false);
        if (!result.destination) return;
        const newItems = reorder(items, result.source.index, result.destination.index);
        setItems(newItems);
        calculateTimings(newItems, runsheet.time);
        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
            batch.update(doc(db, `runsheets/${runsheet.id}/programme`, item.id), { orderCount: index });
        });
        await batch.commit();
    };

    const handleAddItem = async (data) => {
        try {
            let insertIndex = items.length;
            if (currentItem && typeof currentItem.insertAtIndex === 'number') insertIndex = currentItem.insertAtIndex;
            const tempId = `temp-${Date.now()}`;
            const newNode = { id: tempId, text: data.text, remarks: data.remarks || '', duration: data.duration || 0, location: data.location || '', links: data.links || [] };
            const newItems = [...items];
            newItems.splice(insertIndex, 0, newNode);
            setItems(newItems);
            calculateTimings(newItems, runsheet.time);
            setIsItemDialogOpen(false);
            setCurrentItem(null);
            const { id, ...nodeData } = newNode;
            const docRef = await addDoc(collection(db, `runsheets/${runsheet.id}/programme`), nodeData);
            setItems(prevItems => prevItems.map(item => item.id === tempId ? { ...item, id: docRef.id } : item));
            const batch = writeBatch(db);
            newItems.forEach((item, index) => {
                const itemId = item.id === tempId ? docRef.id : item.id;
                batch.update(doc(db, `runsheets/${runsheet.id}/programme`, itemId), { orderCount: index });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error adding item:", error);
        }
    };

    const handleEditItem = async (data) => {
        if (!currentItem || !currentItem.id) return;
        const updatedItems = items.map(item =>
            item.id === currentItem.id ? { ...item, text: data.text, remarks: data.remarks || '', duration: data.duration || 0, location: data.location || '', links: data.links || [] } : item
        );
        setItems(updatedItems);
        calculateTimings(updatedItems, runsheet.time);
        setIsItemDialogOpen(false);
        setCurrentItem(null);
        await updateDoc(doc(db, `runsheets/${runsheet.id}/programme`, currentItem.id), { text: data.text, remarks: data.remarks || '', duration: data.duration || 0, location: data.location || '', links: data.links || [] });
    };

    const handleDeleteItem = async () => {
        if (!deleteItemDialog.itemId) return;
        const newItems = items.filter(item => item.id !== deleteItemDialog.itemId);
        setItems(newItems);
        calculateTimings(newItems, runsheet.time);
        setDeleteItemDialog({ open: false, itemId: null });
        try { await deleteDoc(doc(db, `runsheets/${runsheet.id}/programme`, deleteItemDialog.itemId)); } catch (error) { console.error("Error deleting item:", error); }
    };

    const quickUpdateItem = async (itemId, updates) => {
        // For local state: strip null values so fields are removed from the object entirely
        const localUpdates = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== null)
        );
        const updatedItems = items.map(item =>
            item.id === itemId
                ? Object.fromEntries(Object.entries({ ...item, ...updates }).filter(([, v]) => v !== null))
                : item
        );
        setItems(updatedItems);
        calculateTimings(updatedItems, runsheet.time);
        // For Firestore: convert null values to deleteField() to actually remove them
        const firestoreUpdates = Object.fromEntries(
            Object.entries(updates).map(([k, v]) => [k, v === null ? deleteField() : v])
        );
        try { await updateDoc(doc(db, `runsheets/${runsheet.id}/programme`, itemId), firestoreUpdates); } catch (error) { console.error("Error updating item:", error); }
    };

    const showOpsToast = (message, onUndo) => {
        if (opsToastTimerRef.current) clearTimeout(opsToastTimerRef.current);
        setOpsToast({ message, onUndo });
        opsToastTimerRef.current = setTimeout(() => setOpsToast(null), 5000);
    };

    const handleLogTransition = (itemId) => {
        const currentMoment = moment();
        const itemToUpdate = items.find(item => item.id === itemId);
        if (!itemToUpdate) return;

        const timing = timings[itemId];
        if (!timing || !timing.obj) return;

        const startTime = timing.obj;
        // Map current time to startTime's date to ignore runsheet day differences
        let currentAdjusted = startTime.clone().hours(currentMoment.hours()).minutes(currentMoment.minutes()).seconds(currentMoment.seconds());

        // If the logged time looks like it's from the "next day" (e.g., passed midnight)
        if (currentAdjusted.isBefore(startTime) && startTime.diff(currentAdjusted, 'hours') > 12) {
            currentAdjusted.add(1, 'day');
        }

        // Use floor so that 8:00:59 → 0 min diff → clamp to 1; but 8:01:00 → 1 min
        const diffMinutes = Math.max(1, Math.floor(currentAdjusted.diff(startTime, 'minutes', true)));

        const prevDuration = parseInt(itemToUpdate.duration) || 0;
        const prevOriginal = itemToUpdate.originalDuration;
        const updates = { duration: diffMinutes };
        if (itemToUpdate.originalDuration === undefined) {
            updates.originalDuration = prevDuration;
        }

        quickUpdateItem(itemId, updates);

        showOpsToast(`Logged end time for "${itemToUpdate.text || 'item'}"`, () => {
            const undoUpdates = { duration: prevDuration };
            if (prevOriginal === undefined) undoUpdates.originalDuration = null;
            quickUpdateItem(itemId, undoUpdates);
        });
    };

    const handleLogTransitionAt = (itemId, timeString) => {
        // timeString is HH:mm from the input
        const itemToUpdate = items.find(item => item.id === itemId);
        if (!itemToUpdate) return;

        const timing = timings[itemId];
        if (!timing || !timing.obj) return;

        const startTime = timing.obj;
        const loggedMoment = moment(timeString, 'HH:mm');

        // Map logged time to startTime's date to ignore runsheet day differences
        let loggedAdjusted = startTime.clone().hours(loggedMoment.hours()).minutes(loggedMoment.minutes()).seconds(0);

        // If the logged time looks like it's from the "next day" (e.g., passed midnight)
        if (loggedAdjusted.isBefore(startTime) && startTime.diff(loggedAdjusted, 'hours') > 12) {
            loggedAdjusted.add(1, 'day');
        }

        const diffMinutes = Math.max(1, Math.floor(loggedAdjusted.diff(startTime, 'minutes', true)));

        const prevDuration = parseInt(itemToUpdate.duration) || 0;
        const prevOriginal = itemToUpdate.originalDuration;
        const updates = { duration: diffMinutes };
        if (itemToUpdate.originalDuration === undefined) {
            updates.originalDuration = prevDuration;
        }

        quickUpdateItem(itemId, updates);

        showOpsToast(`Logged missed transition for "${itemToUpdate.text || 'item'}" at ${timeString}`, () => {
            const undoUpdates = { duration: prevDuration };
            if (prevOriginal === undefined) undoUpdates.originalDuration = null;
            quickUpdateItem(itemId, undoUpdates);
        });
    };

    const handleBackToDashboard = () => {
        if (!user && runsheet?.groupId) {
            // Logged-out user viewing a group's runsheet → go to public group page
            router.replace(`/group/${runsheet.groupId}`);
            return;
        }
        if (runsheet?.groupId) {
            setActiveFilter(runsheet.groupId);
        } else {
            setActiveFilter('upcoming');
        }
        router.replace('/dashboard');
    };

    const handleMetadataUpdate = async (formData) => {
        setIsMetadataDialogOpen(false);
        try {
            await updateDoc(doc(db, 'runsheets', runsheet.id), { name: formData.name, date: formData.date, time: formData.time, lastUpdated: moment().format() });
        } catch (error) {
            console.error("Error updating metadata", error);
        }
    };

    const openAddAtIndex = (index) => { setCurrentItem({ insertAtIndex: index }); setIsItemDialogOpen(true); };

    const isItemActive = (item) => {
        const timing = timings[item.id];
        if (!timing || !timing.obj) return false;
        const startTime = timing.obj;
        const endTime = startTime.clone().add(parseInt(item.duration) || 0, 'minutes');
        return now.isSameOrAfter(startTime) && now.isBefore(endTime);
    };

    const handleItemSubmit = (data) => {
        if (currentItem && currentItem.id) handleEditItem(data);
        else handleAddItem(data);
    };

    // ── Compute total duration ──
    const totalDuration = items.reduce((sum, item) => sum + (parseInt(item.duration) || 0), 0);
    const totalHours = Math.floor(totalDuration / 60);
    const totalMins = totalDuration % 60;

    // ── Mode pill component ──
    const renderModePills = ({ className = '' } = {}) => (
        <div className={`flex items-center gap-1 p-1 h-10 rounded-xl bg-muted border border-border/40 shadow-xs ${className}`}>
            {effectiveIsEditor ? (
                <>
                    {['view', 'edit', 'reorder', 'ops'].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`
                                h-full px-3 md:px-4 rounded-lg text-[10px] md:text-[11px] font-bold uppercase tracking-normal md:tracking-[0.08em] transition-all duration-200 border
                                ${mode === m
                                    ? 'border-primary/30 bg-primary/10 text-primary shadow-sm dark:bg-primary/15 dark:border-primary/40'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                                }
                            `}
                        >
                            {m}
                        </button>
                    ))}
                    <button
                        onClick={() => setMode('advanced')}
                        className={`
                            hidden md:block h-full px-4 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200 border
                            ${mode === 'advanced'
                                ? 'border-primary/30 bg-primary/10 text-primary shadow-sm dark:bg-primary/15 dark:border-primary/40'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                            }
                        `}
                    >
                        advanced
                    </button>
                </>
            ) : isOps ? (
                <>
                    {['view', 'ops'].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`
                                h-full px-3 md:px-4 rounded-lg text-[10px] md:text-[11px] font-bold uppercase tracking-normal md:tracking-[0.08em] transition-all duration-200 border
                                ${mode === m
                                    ? 'border-primary/30 bg-primary/10 text-primary shadow-sm dark:bg-primary/15 dark:border-primary/40'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                                }
                            `}
                        >
                            {m}
                        </button>
                    ))}
                </>
            ) : (
                <div className="h-full flex items-center px-4 text-[11px] font-bold uppercase text-muted-foreground tracking-wider">View Only</div>
            )}
        </div>
    );


    const renderAdvancedContent = () => (
        <main className="flex-1 flex flex-col pt-2 relative px-0 page-enter overflow-hidden">
            {/* Beta banner */}
            <div className="mb-3 mx-0.5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border/40 text-muted-foreground text-[12px]">
                <span className="material-symbols-outlined text-[16px] shrink-0 text-primary/60">info</span>
                <span>You&rsquo;re using <span className="font-semibold text-foreground">Advanced Mode</span> — still in beta, so you might spot a bug or two! <span className="hidden sm:inline">Double-click any cell to edit, hit <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[11px] font-mono">Enter</kbd> to save, and drag rows by the handle on the left to reorder.</span></span>
            </div>

            <AdvancedGrid
                items={items}
                timings={timings}
                theme={theme}
                runsheetId={runsheet.id}
                runsheetTime={runsheet.time}
                setItems={setItems}
                calculateTimings={calculateTimings}
                quickUpdateItem={quickUpdateItem}
                setCurrentItem={setCurrentItem}
                setIsItemDialogOpen={setIsItemDialogOpen}
                setDeleteItemDialog={setDeleteItemDialog}
            />

            <div className="p-8 flex justify-center">
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full shadow-sm bg-background border-dashed hover:border-primary hover:text-primary transition-colors pr-4 py-5"
                    onClick={async () => {
                        // add a blank row immediately
                        const tempId = `temp-${Date.now()}`;
                        const newNode = { id: tempId, text: '', remarks: '', duration: 0, location: '' };
                        const newItems = [...items, newNode];
                        setItems(newItems);
                        calculateTimings(newItems, runsheet.time);

                        const { id, ...nodeData } = newNode;
                        const docRef = await addDoc(collection(db, `runsheets/${runsheet.id}/programme`), { ...nodeData, orderCount: items.length });
                        setItems(prev => prev.map(i => i.id === tempId ? { ...i, id: docRef.id } : i));
                    }}
                >
                    <AddIcon className="mr-1 text-[16px]" /> Add new item
                </Button>
            </div>
        </main>
    );

    // ── Mobile header ──
    const renderMobileHeader = () => {
        const showBackButton = !!user || fromGroup;
        return (
            <header className="md:hidden sticky top-0 z-50 bg-background border-b border-border/30 px-3 pt-3 pb-2">
                <div className="flex items-center justify-between">
                    {showBackButton ? (
                        <button
                            onClick={handleBackToDashboard}
                            className="flex size-10 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95"
                        >
                            <ArrowBackIcon style={{ fontSize: 20 }} />
                        </button>
                    ) : (
                        <div className="size-10" />
                    )}

                    {activeTab === 'runsheet' && renderModePills()}

                    <div className="size-10" />
                </div>
            </header>
        );
    };

    // ── Runsheet content ──
    const renderRunsheetContent = () => (
        <main
            className={`flex-1 flex flex-col pt-2 pb-32 relative px-0 ${hasEntered ? '' : 'page-enter'}`}
            onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) {
                    setHasEntered(true);
                }
            }}
        >
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <Droppable droppableId="programme" isDropDisabled={mode !== 'reorder'} isDragDisabled={mode !== 'reorder'}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="w-full">
                            {mode === 'edit' && !isDragging && (
                                <div className="flex w-full mb-4 z-10 relative items-center">
                                    <div className="w-[25%]"></div>
                                    <div className="w-[75%] pl-4 pr-4">
                                        <button
                                            onClick={() => openAddAtIndex(0)}
                                            className="w-full h-9 flex items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 group active:scale-[0.98]"
                                        >
                                            <AddIcon className="text-[18px] group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {items.map((item, index) => {
                                const timing = timings[item.id] || { start: '--:--', amPm: '--', obj: null };
                                const origTiming = originalTimings[item.id] || timing;
                                const isHighlighted = isItemActive(item);

                                const duration = parseInt(item.duration) || 0;
                                const origDuration = item.originalDuration !== undefined ? parseInt(item.originalDuration) : duration;
                                // Only show diffs for items the user has explicitly logged
                                const hasBeenLogged = item.originalDuration !== undefined && item.originalDuration !== null;
                                const itemDiffMinutes = hasBeenLogged ? duration - origDuration : 0;

                                // Calculate visual representation for item height
                                let extraPadding = 0;
                                if (duration > 10 && !isDragging && mode !== 'reorder') {
                                    extraPadding = Math.floor((duration - 10) / 5) * 5;
                                }
                                extraPadding = Math.min(extraPadding, 200); // cap at 200px

                                const hasSubContent = item.location || (Array.isArray(item.links) && item.links.length > 0) || item.remarks;

                                const currentEndTime = timing.obj ? timing.obj.clone().add(duration, 'minutes') : null;

                                return (
                                    <div key={item.id}>
                                        <Draggable draggableId={item.id} index={index} isDragDisabled={mode !== 'reorder'}>
                                            {(provided, snapshot) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps}>
                                                    <div className="flex w-full mb-1.5 z-10 relative group">
                                                        {/* Time column */}
                                                        <div className="w-[25%] shrink-0 pt-4 text-right flex flex-col items-end pr-0">
                                                            {mode === 'ops' && origTiming.start !== timing.start ? (
                                                                <>
                                                                    <del className="text-xs text-muted-foreground leading-none">{origTiming.start}</del>
                                                                    <div className="flex items-baseline gap-1 transition-colors text-primary mt-0.5">
                                                                        <span className="text-xl font-bold leading-none tracking-tight">{timing.start}</span>
                                                                        <span className={`text-[9px] font-bold uppercase ${isHighlighted ? 'text-primary/70' : 'text-primary/70'}`}>{timing.amPm}</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex items-baseline gap-1 transition-colors text-primary">
                                                                    <span className="text-xl font-bold leading-none tracking-tight">{timing.start}</span>
                                                                    <span className={`text-[9px] font-bold uppercase ${isHighlighted ? 'text-primary/70' : 'text-primary/70'}`}>{timing.amPm}</span>
                                                                </div>
                                                            )}

                                                            {mode === 'ops' && hasBeenLogged && origDuration !== duration ? (
                                                                <div className="flex items-baseline gap-1 transition-colors text-primary">
                                                                    <span className={`text-xl font-bold uppercase ${isHighlighted ? 'text-primary/70' : 'text-primary/70'}`}>–{currentEndTime.format("h:mm")}</span>
                                                                    <span className={`text-[9px] font-bold uppercase ${isHighlighted ? 'text-primary/70' : 'text-primary/70'}`}>{currentEndTime.format("A")}</span>
                                                                </div>
                                                            ) : (<></>)}

                                                            <div className={`mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums flex flex-col items-end gap-0.5 ${isHighlighted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                {(mode === 'ops' || mode === 'view') && hasBeenLogged && origDuration !== duration ? (
                                                                    <>
                                                                        <del className="text-[10px] opacity-70 leading-none">{origDuration} min</del>
                                                                        <span className={itemDiffMinutes > 0 ? 'text-amber-500' : 'text-emerald-500'}>
                                                                            {duration} min
                                                                            {mode === 'ops' && (
                                                                                <>
                                                                                    <br />
                                                                                    <span className="opacity-70">({itemDiffMinutes > 0 ? '+' : ''}{itemDiffMinutes}m)</span>
                                                                                </>
                                                                            )}
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <span>{duration} min</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Card */}
                                                        <div className="w-[75%] pl-3 pr-3 md:pl-4 md:pr-4">
                                                            <div
                                                                {...(mode === 'reorder' ? provided.dragHandleProps : {})}
                                                                onClick={() => {
                                                                    if (mode === 'edit') { setCurrentItem(item); setIsItemDialogOpen(true); }
                                                                }}
                                                                style={{ paddingBottom: `calc(1rem + ${extraPadding}px)` }}
                                                                className={`
                                                                    rounded-xl p-4 border transition-all duration-200 relative overflow-hidden h-full
                                                                    ${mode === 'edit' ? 'cursor-pointer hover:shadow-md hover:border-primary/20' : 'cursor-default'}
                                                                    ${mode === 'reorder' ? 'cursor-grab active:cursor-grabbing hover:border-primary/20 hover:shadow-md' : ''}
                                                                    ${snapshot.isDragging ? 'shadow-lg rotate-1 scale-[1.02]' : ''}
                                                                    ${isHighlighted
                                                                        ? 'bg-primary/5 dark:bg-primary/8 border-primary/20 shadow-sm shadow-primary/5 pulse-glow'
                                                                        : 'bg-card border-border/60 shadow-xs hover:shadow-sm'
                                                                    }
                                                                `}
                                                            >
                                                                {/* Active indicator bar */}
                                                                {isHighlighted && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full"></div>}
 
                                                                {/* Drag handle UI */}
                                                                {mode === 'reorder' && (
                                                                    <div
                                                                        className="absolute top-1.5 left-1/2 -translate-x-1/2 p-0.5 text-muted-foreground/40 rounded-md z-20 pointer-events-none"
                                                                    >
                                                                        <DragHandleIcon style={{ fontSize: 16 }} />
                                                                    </div>
                                                                )}

                                                                <div className={`flex-1 flex flex-col ${mode === 'edit' || mode === 'reorder' ? 'mt-4' : ''}`}>
                                                                    <div className="flex items-start justify-between mb-1 relative z-10">
                                                                        <div className="min-w-0 flex-1">
                                                                            <h3 className={`text-[15px] font-bold leading-snug ${isHighlighted ? 'text-foreground' : 'text-foreground'} ${hasSubContent && !isDragging && mode !== 'reorder' ? 'mb-2' : ''}`}>
                                                                                {item.text}
                                                                            </h3>
                                                                            {!isDragging && mode !== 'reorder' && item.location && (
                                                                                <div className="flex items-center gap-1.5 mt-1.5 min-h-[25px]">
                                                                                    <LocationOnIcon style={{ fontSize: 14 }} className="text-muted-foreground" />
                                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.location}</span>
                                                                                </div>
                                                                            )}
                                                                            {/* Links */}
                                                                            {!isDragging && mode !== 'reorder' && Array.isArray(item.links) && item.links.length > 0 && (
                                                                                <div className="flex flex-col gap-2 mt-2">
                                                                                    {item.links.map((link, li) => (
                                                                                        link.url ? (
                                                                                            <a
                                                                                                key={li}
                                                                                                href={link.url}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                onClick={e => e.stopPropagation()}
                                                                                                className="flex items-center justify-between gap-3 min-h-[28px] px-2.5 py-1.5 rounded-lg border border-primary/30 text-[10px] font-bold uppercase tracking-wider text-primary/70 transition-colors hover:bg-primary/5 hover:border-primary/50 hover:text-primary w-full"
                                                                                            >
                                                                                                <div className="flex items-center gap-1.5">
                                                                                                    <span className="text-sm dark:brightness-[1.2] dark:saturate-[1.1]">{link.emoji}</span>
                                                                                                    <span>{link.name || link.url}</span>
                                                                                                </div>
                                                                                                <OpenInNewIcon style={{ fontSize: 14 }} className="opacity-70" />
                                                                                            </a>
                                                                                        ) : link.name ? (
                                                                                            <span
                                                                                                key={li}
                                                                                                className="flex items-center gap-1.5 min-h-[28px] px-2.5 py-1.5 rounded-lg border border-primary/30 text-[10px] font-bold uppercase tracking-wider text-primary/70 w-full"
                                                                                            >
                                                                                                <span className="text-sm dark:brightness-[1.2] dark:saturate-[1.1]">{link.emoji}</span>
                                                                                                <span>{link.name}</span>
                                                                                            </span>
                                                                                        ) : null
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {mode === 'edit' && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setDeleteItemDialog({ open: true, itemId: item.id }); }}
                                                                                className="text-muted-foreground/40 hover:text-destructive transition-colors pb-1 px-1 pt-0 rounded-lg hover:bg-destructive/10"
                                                                            >
                                                                                <DeleteIcon style={{ fontSize: 18 }} />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {!isDragging && mode !== 'reorder' && item.remarks && (
                                                                        <div
                                                                            className={`text-sm leading-relaxed mt-2 relative z-10 prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-p:min-h-[1em] prose-ul:my-1 prose-ol:my-1 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5 prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal ${isHighlighted ? 'text-foreground/80' : 'text-muted-foreground'}`}
                                                                            dangerouslySetInnerHTML={{ __html: item.remarks.includes('<') ? item.remarks : item.remarks.replace(/\n/g, '<br />') }}
                                                                        />
                                                                    )}

                                                                    {/* Active item decorative element */}
                                                                    {isHighlighted && (
                                                                        <div className="absolute -bottom-4 -right-4 text-primary/[0.03] pointer-events-none">
                                                                            <GraphicEqIcon style={{ fontSize: 100 }} />
                                                                        </div>
                                                                    )}

                                                                    {/* {mode === 'ops' && hasBeenLogged && currentEndTime && (
                                                                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-medium relative z-10 gap-2">
                                                                            <span className="text-muted-foreground whitespace-nowrap">End Time</span>
                                                                            <div className="flex flex-wrap items-center justify-end gap-1.5 text-right">
                                                                                {hasBeenLogged && itemDiffMinutes !== 0 ? (
                                                                                    <>
                                                                                        <del className="text-muted-foreground/60">{timing.obj ? timing.obj.clone().add(origDuration, 'minutes').format('h:mm A') : ''}</del>
                                                                                        <span className={itemDiffMinutes > 0 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                                                                                            {currentEndTime.format("h:mm A")} ({itemDiffMinutes > 0 ? '+' : ''}{itemDiffMinutes}m)
                                                                                        </span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground font-bold">{currentEndTime.format("h:mm A")}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )} */}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>

                                        {(mode === 'edit' ? !isDragging : mode === 'ops') && (
                                            <div className="flex w-full mb-4 z-10 relative items-center">
                                                <div className="w-[25%]"></div>
                                                <div className="w-[75%] pl-3 pr-3 md:pl-4 md:pr-4">
                                                    {mode === 'edit' ? (
                                                        <button
                                                            onClick={() => openAddAtIndex(index + 1)}
                                                            className="w-full h-9 flex items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 group active:scale-[0.98]"
                                                        >
                                                            <AddIcon className="text-[18px] group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    ) : (
                                                        <div className="w-full h-9 flex rounded-xl border-2 border-dashed border-border overflow-hidden hover:border-primary hover:bg-primary/5 transition-all duration-200 group">
                                                            <button
                                                                onClick={() => handleLogTransition(item.id)}
                                                                className="flex-1 flex items-center justify-center text-muted-foreground hover:text-primary text-xs font-semibold gap-1.5 active:scale-[0.98]"
                                                            >
                                                                <UpdateIcon className="text-[16px]" />
                                                                Log End Time
                                                            </button>
                                                            <div className="w-px bg-border/60 group-hover:bg-primary/20 transition-colors" />
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button className="w-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                                                                        <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-52">
                                                                    <DropdownMenuItem onClick={() => {
                                                                        const now = moment();
                                                                        setLogMissedTime(now.format('HH:mm'));
                                                                        setLogMissedDialog({ open: true, itemId: item.id, itemLabel: item.text || 'item' });
                                                                    }}>
                                                                        <span className="material-symbols-outlined text-base mr-2">history</span>
                                                                        Log Missed Transition
                                                                    </DropdownMenuItem>
                                                                    {item.originalDuration !== undefined && (
                                                                        <>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => {
                                                                                    const orig = parseInt(item.originalDuration);
                                                                                    quickUpdateItem(item.id, { duration: orig, originalDuration: null });
                                                                                    showOpsToast(`Reset log for "${item.text || 'item'}"`, () => {
                                                                                        quickUpdateItem(item.id, { duration: parseInt(item.duration), originalDuration: item.originalDuration });
                                                                                    });
                                                                                }}
                                                                                className="text-muted-foreground"
                                                                            >
                                                                                <span className="material-symbols-outlined text-base mr-2">restart_alt</span>
                                                                                Reset Log
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {items.length > 0 && (
                                (() => {
                                    const lastItem = items[items.length - 1];
                                    const lastTiming = timings[lastItem.id];
                                    const origLastTiming = originalTimings[lastItem.id] || lastTiming;

                                    if (lastTiming && lastTiming.obj && !isDragging) {
                                        const duration = parseInt(lastItem.duration) || 0;
                                        const origDuration = lastItem.originalDuration !== undefined ? parseInt(lastItem.originalDuration) : duration;

                                        const currentEndTime = lastTiming.obj.clone().add(duration, 'minutes');
                                        const origEndTime = origLastTiming.obj ? origLastTiming.obj.clone().add(origDuration, 'minutes') : null;
                                        const endDiffMinutes = origEndTime ? currentEndTime.diff(origEndTime, 'minutes') : 0;

                                        return (
                                            <div className="flex flex-col w-full mt-4 mb-8 pb-8 z-10 relative items-center justify-center gap-2">
                                                <div className="px-4 py-2 rounded-full bg-muted/50 border border-border/50 shadow-sm flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">End Time:</span>
                                                    <span className="text-sm font-bold text-primary tabular-nums tracking-wide">{currentEndTime.format("h:mm A")}</span>
                                                    <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                                                </div>
                                                {mode === 'ops' && endDiffMinutes !== 0 && (
                                                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold tabular-nums border flex items-center gap-1.5 ${endDiffMinutes > 0 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                                                        {endDiffMinutes > 0 ? (
                                                            <>
                                                                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                                                Total Difference: +{endDiffMinutes} min
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-[14px]">trending_down</span>
                                                                Total Difference: {endDiffMinutes} min
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            )}


                            {programmeLoading && items.length === 0 && (
                                <div className="flex flex-col gap-3 px-4 md:px-0 py-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="flex w-full gap-4 animate-pulse">
                                            <div className="w-[25%] flex flex-col items-end gap-2 pt-3">
                                                <div className="h-5 w-12 rounded-lg bg-muted"></div>
                                                <div className="h-4 w-10 rounded-md bg-muted/60"></div>
                                            </div>
                                            <div className="flex-1 py-3 pr-4">
                                                <div className="h-4 w-3/4 rounded-lg bg-muted mb-2"></div>
                                                <div className="h-3 w-1/2 rounded-md bg-muted/60"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!programmeLoading && items.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                                        <span className="material-symbols-outlined text-3xl text-muted-foreground">playlist_add</span>
                                    </div>
                                    <p className="text-base font-semibold text-foreground">No items yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">Switch to Edit mode to add programme items.</p>
                                </div>
                            )}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </main>
    );

    // ── Runsheet List Sidebar ──
    const renderRunsheetListSidebar = () => {
        let groupName = 'Runsheets';
        let groupRunsheets = [];
        let showLoadMore = false;

        if (activeFilter === 'upcoming') {
            groupName = 'Upcoming';
            groupRunsheets = runsheets?.filter(r =>
                !moment(r.date).isBefore(moment(), 'day') &&
                r.category !== 'archive'
            ) || [];
        } else if (activeFilter === 'past' || activeFilter === 'archive') {
            groupName = activeFilter === 'past' ? 'Past' : 'Archive';
            const isArchive = activeFilter === 'archive';

            let list = runsheets?.filter(r => {
                if (isArchive) return r.category === 'archive';
                return moment(r.date).isBefore(moment(), 'day') && r.category !== 'archive';
            }) || [];

            list.sort((a, b) => new Date(a.date) - new Date(b.date));

            const currentIndex = list.findIndex(r => r.id === runsheet.id);
            if (currentIndex !== -1) {
                const startIndex = Math.max(0, currentIndex - 3);
                const endIndex = Math.min(list.length - 1, currentIndex + 3);
                groupRunsheets = list.slice(startIndex, endIndex + 1);

                if (list.length > groupRunsheets.length) {
                    showLoadMore = true;
                }
            } else {
                groupRunsheets = list.slice(0, 7);
                if (list.length > 7) showLoadMore = true;
            }
        } else {
            // "if i'm in a group, the leftmost plane should show my group"
            const currentGroup = groups?.find(g => g.id === runsheet.groupId || g.id === activeFilter);
            groupName = currentGroup ? currentGroup.name : 'Runsheets';

            const filterGroupId = runsheet.groupId || activeFilter;
            groupRunsheets = runsheets?.filter(r => r.groupId === filterGroupId) || [];

            const currentIsPast = moment(runsheet.date).isBefore(moment(), 'day');
            if (!currentIsPast && !filterGroupId) {
                groupRunsheets = groupRunsheets.filter(r => !moment(r.date).isBefore(moment(), 'day'));
            }
        }

        const grouped = {};
        groupRunsheets.forEach(rs => {
            const groupKey = moment(rs.date).format('MMMM YYYY');
            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push(rs);
        });
        const sortedKeys = Object.keys(grouped).sort((a, b) => moment(a, 'MMMM YYYY').diff(moment(b, 'MMMM YYYY')));

        const showBackButton = !!user || fromGroup;

        return (
            <aside className={`hidden md:flex flex-col border-r border-border bg-muted/90 dark:bg-[#1f2126] pt-4 pb-4 h-screen sticky top-0 shrink-0 z-10 transition-all ${effectiveListSidebarOpen ? 'w-[200px] lg:w-[260px] shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]' : 'w-[80px]'}`}>
                {/* Back and Toggle Header */}
                <div className={`flex mb-4 px-3 ${effectiveListSidebarOpen ? 'items-center justify-between' : 'flex-col items-center gap-2'}`}>
                    {effectiveListSidebarOpen ? (
                        <button
                            onClick={handleBackToDashboard}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                            <ArrowBackIcon style={{ fontSize: 14 }} />
                            Dashboard
                        </button>
                    ) : (
                        showBackButton && (
                            <button
                                onClick={handleBackToDashboard}
                                className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                title="Back to Dashboard"
                            >
                                <ArrowBackIcon style={{ fontSize: 18 }} />
                            </button>
                        )
                    )}
                    {user && (
                        <button
                            onClick={() => setIsListSidebarOpen(!isListSidebarOpen)}
                            className={`flex items-center justify-center rounded-xl transition-all ${effectiveListSidebarOpen ? 'w-8 h-8 bg-primary/10 text-primary' : 'w-10 h-10 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            title="Toggle Runsheet List"
                        >
                            <span className="material-symbols-outlined text-[18px]">view_sidebar</span>
                        </button>
                    )}
                </div>

                {effectiveListSidebarOpen && (
                    <div className="flex-1 flex flex-col overflow-hidden mt-1">
                        <div className="px-5 mb-2 mt-2">
                            <h2 className="text-lg font-extrabold tracking-tight text-foreground">{groupName}</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-4 scrollbar-thin">
                            {sortedKeys.map(monthKey => (
                                <div key={monthKey} className="space-y-1.5">
                                    <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] px-3 pt-2 pb-1">{monthKey}</h2>
                                    {grouped[monthKey].map(rs => {
                                        const dateObj = moment(rs.date);
                                        const niceDate = dateObj.format('D');
                                        const dayName = dateObj.format('ddd');
                                        const isToday = dateObj.isSame(moment(), 'day');
                                        const isActive = rs.id === runsheet.id;

                                        return (
                                            <button
                                                key={rs.id}
                                                onClick={() => router.push(`/runsheet/${rs.id}`)}
                                                className={`w-full text-left p-2 rounded-2xl transition-all flex items-start gap-3 group active:scale-[0.98] ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                                            >
                                                <div className={`flex flex-col items-center justify-center w-[42px] h-[42px] rounded-lg shrink-0 transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : isToday ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                    <span className="text-[8px] font-bold uppercase tracking-wide leading-none">{dayName}</span>
                                                    <span className="text-[15px] font-extrabold leading-none mt-[2px]">{niceDate}</span>
                                                </div>
                                                <div className="flex-1 min-w-0 flex items-center min-h-[42px]">
                                                    <h3 className={`text-[12px] font-bold leading-snug line-clamp-2 transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                                                        {rs.name}
                                                    </h3>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                            {groupRunsheets.length === 0 && (
                                <div className="text-center text-xs text-muted-foreground mt-4 px-4">
                                    No other runsheets found.
                                </div>
                            )}
                            {showLoadMore && (
                                <div className="px-3 pt-2">
                                    <button
                                        onClick={handleBackToDashboard}
                                        className="w-full text-center py-2 text-[11px] uppercase tracking-wider font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 rounded-xl"
                                    >
                                        Load more in Dashboard...
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        );
    };

    // ── Desktop Sidebar ──
    const renderDesktopSidebar = () => (
        <aside className="hidden md:flex flex-col w-[80px] border-r border-border bg-sidebar pt-4 pb-4 justify-between h-screen sticky top-0 z-20">
            <div className="flex flex-col gap-1 w-full">

                {/* Nav */}
                <div className="flex flex-col gap-6 mt-2 w-full">
                    <button
                        onClick={() => setActiveTab('runsheet')}
                        className={`flex flex-col items-center w-full gap-1 transition-all active:scale-95 ${activeTab === 'runsheet' ? 'text-primary' : 'text-muted-foreground hover:text-foreground group'}`}
                    >
                        <div className={`flex items-center justify-center w-[52px] py-1.5 rounded-xl transition-colors ${activeTab === 'runsheet' ? 'bg-primary/10' : ''}`}>
                            <CalendarViewDayIcon className={activeTab === 'runsheet' ? "text-[24px]" : "text-[24px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[11px] font-bold">Runsheet</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex flex-col items-center w-full gap-1 transition-all active:scale-95 ${activeTab === 'notes' ? 'text-primary' : 'text-muted-foreground hover:text-foreground group'}`}
                    >
                        <div className={`flex items-center justify-center w-[52px] py-1.5 rounded-xl transition-colors ${activeTab === 'notes' ? 'bg-primary/10' : ''}`}>
                            <ArticleIcon className={activeTab === 'notes' ? "text-[24px]" : "text-[24px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[11px] font-bold">Notes</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`flex flex-col items-center w-full gap-1 transition-all active:scale-95 ${activeTab === 'share' ? 'text-primary' : 'text-muted-foreground hover:text-foreground group'}`}
                    >
                        <div className={`flex items-center justify-center w-[52px] py-1.5 rounded-xl transition-colors ${activeTab === 'share' ? 'bg-primary/10' : ''}`}>
                            <ShareIcon className={activeTab === 'share' ? "text-[24px]" : "text-[24px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[11px] font-bold">Share</span>
                    </button>
                </div>
            </div>

            {/* Bottom section */}
            <div className="flex flex-col gap-3 px-4 pb-2">
            </div>
        </aside>
    );

    return (
        <div className="relative flex h-full min-h-screen w-full flex-row overflow-hidden bg-background text-foreground">

            {renderRunsheetListSidebar()}
            {renderDesktopSidebar()}

            <div className={`flex-1 flex flex-col h-screen relative w-full scrollbar-thin ${mode === 'advanced' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                <div className={`w-full mx-auto flex-1 flex flex-col pb-32 md:pb-12 md:pt-6 md:px-6 transition-all duration-300 ${mode === 'advanced' ? 'max-w-[1400px] h-full overflow-hidden' : 'max-w-3xl min-h-full'}`}>

                    {/* Common Headers */}
                    {(activeTab === 'runsheet' || activeTab === 'notes') && (
                        <>
                            {/* Mobile header */}
                            {renderMobileHeader()}

                            {/* Mobile runsheet info */}
                            <div className="md:hidden flex flex-col gap-1 px-5 pt-4 mb-4 page-enter">
                                <div className="flex items-start justify-between gap-3">
                                    <h1 className="text-[26px] leading-snug font-extrabold tracking-tight text-foreground line-clamp-2">{runsheet.name}</h1>
                                    {effectiveIsEditor && (
                                        <button
                                            onClick={() => setIsMetadataDialogOpen(true)}
                                            className="mt-1 shrink-0 flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg">
                                        <CalendarTodayIcon style={{ fontSize: 14 }} className="text-muted-foreground" />
                                        <span className="text-xs font-semibold text-foreground">{moment(runsheet.date).format("ddd, MMM D")}</span>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">{items.length} items</span>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {totalHours > 0 ? `${totalHours}h ${totalMins} min` : `${totalMins} min`}
                                    </span>
                                </div>
                            </div>

                            {/* Desktop header */}
                            <div className="hidden md:block mb-6 page-enter">
                                <div className="flex justify-center mb-6">
                                    {activeTab === 'runsheet' && renderModePills()}
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col">
                                        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{runsheet.name}</h2>
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mt-1">
                                            <CalendarTodayIcon style={{ fontSize: 14 }} />
                                            {moment(runsheet.date).format("dddd, MMMM Do YYYY")}

                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                                            {items.length} items
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                                            {totalHours > 0 ? `${totalHours}h ${totalMins} min` : `${totalMins} min`}
                                        </div>
                                    </div>
                                    {effectiveIsEditor && (
                                        <Button variant="outline" size="sm" onClick={() => setIsMetadataDialogOpen(true)} className="rounded-xl">
                                            <span className="material-symbols-outlined text-sm mr-1.5">edit</span>
                                            Edit Details
                                        </Button>
                                    )}
                                </div>
                                <Separator className="my-4" />
                            </div>
                        </>
                    )}

                    {/* Share tab mobile header */}
                    {activeTab === 'share' && (
                        <div className="md:hidden">
                            {renderMobileHeader()}
                            <div className="px-5 pt-4 mb-2">
                                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                                    Share {runsheet.name.length > 15 ? runsheet.name.substring(0, 15) + '...' : runsheet.name}
                                </h1>
                            </div>
                        </div>
                    )}

                    {activeTab === 'runsheet' ? (
                        <>
                            {mode === 'advanced' ? (
                                <div className="hidden md:flex page-enter flex-1 flex-col h-full min-h-0">
                                    {renderAdvancedContent()}
                                </div>
                            ) : (
                                renderRunsheetContent()
                            )}
                            {/* Fallback for mobile if they somehow get into advanced mode */}
                            {mode === 'advanced' && (
                                <div className="md:hidden">
                                    {renderRunsheetContent()}
                                </div>
                            )}
                        </>
                    ) : activeTab === 'notes' ? (
                        <div className="page-enter px-4 md:px-0 mt-4 md:mt-0 pb-28">
                            <NotesTab runsheet={runsheet} isEditor={effectiveIsEditor} mode={mode} />
                        </div>
                    ) : activeTab === 'share' ? (
                        <div className="page-enter mt-2 md:mt-0">
                            <ShareTab
                                runsheetId={runsheet.id}
                                runsheetName={runsheet.name}
                                isEditor={effectiveIsEditor}
                                runsheet={runsheet}
                                programme={items}
                                timings={timings}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {/* ── Bottom Dock - Mobile Only ── */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border/30 pb-8 pt-3 px-6 shadow-xl">
                {/* Ops Mode Controls */}
                {mode === 'ops' && (
                    <div className="absolute bottom-full left-0 right-0 p-4 bg-background border-t border-border/30 flex items-center justify-center shadow-lg animate-in slide-in-from-bottom-3 md:hidden">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Current Time</span>
                            <div className="text-3xl font-mono font-bold text-foreground leading-none tracking-tight">
                                {clock.format("h:mm:ss A")}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-around">
                    <button
                        onClick={() => setActiveTab('runsheet')}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${activeTab === 'runsheet' ? 'text-primary' : 'text-muted-foreground hover:text-foreground group'}`}
                    >
                        <div className={`px-5 py-1 rounded-xl transition-colors ${activeTab === 'runsheet' ? 'bg-primary/10' : ''}`}>
                            <CalendarViewDayIcon className={activeTab === 'runsheet' ? "text-[24px]" : "text-[24px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[10px] font-bold">Runsheet</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${activeTab === 'notes' ? 'text-primary' : 'text-muted-foreground hover:text-foreground group'}`}
                    >
                        <div className={`px-5 py-1 rounded-xl transition-colors ${activeTab === 'notes' ? 'bg-primary/10' : ''}`}>
                            <ArticleIcon className={activeTab === 'notes' ? "text-[24px]" : "text-[24px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[10px] font-bold">Notes</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${activeTab === 'share' ? 'text-primary' : 'text-muted-foreground hover:text-foreground group'}`}
                    >
                        <div className={`px-5 py-1 rounded-xl transition-colors ${activeTab === 'share' ? 'bg-primary/10' : ''}`}>
                            <ShareIcon className={activeTab === 'share' ? "text-[24px]" : "text-[24px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[10px] font-bold">Share</span>
                    </button>
                </div>
            </div>

            {/* FAB - Edit Mode: Add item */}
            {mode === 'edit' && activeTab === 'runsheet' && (
                <div className="fixed bottom-28 right-6 md:right-10 md:bottom-10 z-50">
                    <button
                        onClick={() => openAddAtIndex(items.length)}
                        className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300 active:scale-95 group"
                    >
                        <AddIcon className="text-[28px] group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            )}

            {/* FAB - View Mode: Enter edit */}
            {mode === 'view' && effectiveIsEditor && activeTab === 'runsheet' && (
                <div className="fixed bottom-28 right-6 md:right-10 md:bottom-10 z-50">
                    <button
                        onClick={() => setMode('edit')}
                        className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[26px]">edit</span>
                    </button>
                </div>
            )}

            <ItemDialog
                open={isItemDialogOpen}
                onClose={() => setIsItemDialogOpen(false)}
                onSubmit={handleItemSubmit}
                initialData={currentItem?.id ? currentItem : null}
            />

            <RunsheetMetadataDialog
                open={isMetadataDialogOpen}
                onClose={() => setIsMetadataDialogOpen(false)}
                onSubmit={handleMetadataUpdate}
                initialData={runsheet}
            />



            <ConfirmationDialog
                open={deleteItemDialog.open}
                onClose={() => setDeleteItemDialog({ open: false, itemId: null })}
                onConfirm={handleDeleteItem}
                title="Delete Item"
                message="Are you sure you want to delete this item? This action will remove it from the programme."
                confirmText="Delete"
                confirmStyle="destructive"
            />

            {/* Log Missed Transition dialog */}
            {logMissedDialog.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLogMissedDialog({ open: false, itemId: null, itemLabel: '' })} />
                    <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
                        <h2 className="text-base font-bold mb-1">Log Missed Transition</h2>
                        <p className="text-sm text-muted-foreground mb-4">Set the actual end time for <span className="font-semibold text-foreground">&ldquo;{logMissedDialog.itemLabel}&rdquo;</span>.</p>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Time</label>
                        <input
                            type="time"
                            value={logMissedTime}
                            onChange={e => setLogMissedTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 mb-5"
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setLogMissedDialog({ open: false, itemId: null, itemLabel: '' })}>Cancel</Button>
                            <Button className="flex-1 rounded-xl" onClick={() => {
                                if (logMissedDialog.itemId && logMissedTime) {
                                    handleLogTransitionAt(logMissedDialog.itemId, logMissedTime);
                                }
                                setLogMissedDialog({ open: false, itemId: null, itemLabel: '' });
                            }}>Save</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ops toast */}
            {opsToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl bg-foreground text-background shadow-2xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-200 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[18px] text-background/70">check_circle</span>
                    <span className="truncate max-w-[220px]">{opsToast.message}</span>
                    <button
                        onClick={() => {
                            opsToast.onUndo();
                            if (opsToastTimerRef.current) clearTimeout(opsToastTimerRef.current);
                            setOpsToast(null);
                        }}
                        className="ml-1 underline underline-offset-2 font-bold opacity-70 hover:opacity-100 transition-opacity"
                    >
                        Undo
                    </button>
                    <button onClick={() => { if (opsToastTimerRef.current) clearTimeout(opsToastTimerRef.current); setOpsToast(null); }} className="opacity-50 hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            )}

            {/* Desktop Ops Clock: center align bottom */}
            {mode === 'ops' && (
                <div 
                    className={`
                        hidden md:flex fixed bottom-6 -translate-x-1/2 z-50 px-6 py-3 bg-background/80 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl items-center justify-center animate-in slide-in-from-bottom-4 transition-all duration-300
                        ${effectiveListSidebarOpen 
                            ? 'left-[calc(50%+140px)] lg:left-[calc(50%+170px)]' 
                            : 'left-[calc(50%+80px)]'
                        }
                    `}
                >
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Current Time</span>
                        <div className="text-3xl font-mono font-bold text-foreground leading-none tracking-tight">
                            {clock.format("h:mm:ss A")}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
