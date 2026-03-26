'use client';
import { useState, useEffect, useCallback } from 'react';
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
import CalendarViewDayIcon from '@mui/icons-material/CalendarViewDay';
import UpdateIcon from '@mui/icons-material/Update';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';

import moment from 'moment';
import { doc, updateDoc, writeBatch, collection, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
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
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useRouter } from 'next/navigation';

export default function RunsheetEditor({ runsheet, initialProgramme }) {
    const { user } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState(initialProgramme);
    const [timings, setTimings] = useState({});
    const [now, setNow] = useState(moment());
    const [clock, setClock] = useState(moment());
    const [isEditor, setIsEditor] = useState(false);

    // UI States
    const [mode, setMode] = useState('view'); // 'view', 'edit', 'ops'
    const [activeTab, setActiveTab] = useState('runsheet'); // 'runsheet', 'notes', 'share'

    // Dialogs
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState({ open: false, itemId: null });

    const calculateTimings = useCallback((programmeItems, startTimeStr) => {
        const dateStr = runsheet.date ? runsheet.date.split('T')[0] : moment().format('YYYY-MM-DD');
        let currentTime = moment(`${dateStr} ${startTimeStr}`, "YYYY-MM-DD HHmm");
        const newTimings = {};
        programmeItems.forEach(item => {
            newTimings[item.id] = { start: currentTime.format("h:mm"), amPm: currentTime.format("A"), obj: currentTime.clone() };
            currentTime.add(parseInt(item.duration) || 0, 'minutes');
        });
        setTimings(newTimings);
    }, [runsheet.date]);

    useEffect(() => {
        setItems(initialProgramme);
        calculateTimings(initialProgramme, runsheet.time);
    }, [initialProgramme, runsheet.time, calculateTimings]);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!user?.email) { setIsEditor(false); return; }
            try {
                const userRef = doc(db, `runsheets/${runsheet.id}/users`, user.email);
                const userSnap = await getDoc(userRef);
                const role = userSnap.exists() ? userSnap.data().role : null;
                // owner and editor both count as having edit access
                if (role === 'editor' || role === 'owner') {
                    setIsEditor(true);
                } else {
                    setIsEditor(false);
                    setMode('view');
                }
            } catch (error) {
                console.error("Error checking permissions:", error);
                setIsEditor(false);
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

    const onDragEnd = async (result) => {
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
            const newNode = { id: tempId, text: data.text, remarks: data.remarks || '', duration: data.duration || 0, location: data.location || '' };
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
            item.id === currentItem.id ? { ...item, text: data.text, remarks: data.remarks || '', duration: data.duration || 0, location: data.location || '' } : item
        );
        setItems(updatedItems);
        calculateTimings(updatedItems, runsheet.time);
        setIsItemDialogOpen(false);
        setCurrentItem(null);
        await updateDoc(doc(db, `runsheets/${runsheet.id}/programme`, currentItem.id), { text: data.text, remarks: data.remarks || '', duration: data.duration || 0, location: data.location || '' });
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
        const updatedItems = items.map(item => item.id === itemId ? { ...item, ...updates } : item);
        setItems(updatedItems);
        calculateTimings(updatedItems, runsheet.time);
        try { await updateDoc(doc(db, `runsheets/${runsheet.id}/programme`, itemId), updates); } catch (error) { console.error("Error updating item:", error); }
    };

    const handleLogTransition = () => {
        const currentMoment = moment();
        const activeItem = items.find(item => {
            const timing = timings[item.id];
            if (!timing || !timing.obj) return false;
            const startTime = timing.obj;
            const endTime = startTime.clone().add(parseInt(item.duration) || 0, 'minutes');
            return currentMoment.isSameOrAfter(startTime) && currentMoment.isBefore(endTime);
        });
        if (!activeItem) return;
        const timing = timings[activeItem.id];
        const diffMinutes = Math.max(1, Math.round(currentMoment.diff(timing.obj, 'minutes', true)));
        quickUpdateItem(activeItem.id, { duration: diffMinutes });
    };

    const handleMetadataUpdate = async (formData) => {
        await updateDoc(doc(db, 'runsheets', runsheet.id), { name: formData.name, date: formData.date, time: formData.time, lastUpdated: moment().format() });
        setIsMetadataDialogOpen(false);
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
    const ModePills = ({ className = '' }) => (
        <div className={`flex items-center gap-1 p-1 rounded-xl bg-muted border border-border/40 shadow-xs ${className}`}>
            {isEditor ? (
                ['view', 'edit', 'ops'].map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`
                            px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition-all duration-200
                            ${mode === m
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        {m}
                    </button>
                ))
            ) : (
                <div className="px-4 py-1.5 text-[11px] font-bold uppercase text-muted-foreground tracking-wider">View Only</div>
            )}
        </div>
    );

    // ── Mobile header ──
    const renderMobileHeader = () => (
        <header className="md:hidden sticky top-0 z-50 glass border-b border-border/30 px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex size-10 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all active:scale-95"
                >
                    <ArrowBackIcon style={{ fontSize: 20 }} />
                </button>

                <ModePills />

                {isEditor ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex size-10 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-all active:scale-95">
                                <MoreVertIcon style={{ fontSize: 20 }} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsMetadataDialogOpen(true)}>
                                <span className="material-symbols-outlined text-base mr-2">edit</span>
                                Edit Details
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <div className="size-10" />
                )}
            </div>
        </header>
    );

    // ── Runsheet content ──
    const renderRunsheetContent = () => (
        <main className="flex-1 flex flex-col pt-2 pb-32 relative px-0 page-enter">
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="programme" isDropDisabled={mode === 'view'} isDragDisabled={mode === 'view'}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="w-full">
                            {mode === 'edit' && (
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
                                const timing = timings[item.id] || { start: '--:--', amPm: '--' };
                                const isHighlighted = isItemActive(item);

                                return (
                                    <div key={item.id}>
                                        <Draggable draggableId={item.id} index={index} isDragDisabled={mode !== 'edit'}>
                                            {(provided, snapshot) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps}>
                                                    <div className="flex w-full mb-1.5 z-10 relative group">
                                                        {/* Time column */}
                                                        <div className="w-[25%] shrink-0 pt-4 text-right flex flex-col items-end pr-0">
                                                            <div className="flex items-baseline gap-1 transition-colors text-primary">
                                                                <span className="text-lg font-bold leading-none tracking-tight">{timing.start}</span>
                                                                <span className={`text-[9px] font-bold uppercase ${isHighlighted ? 'text-primary/70' : 'text-primary/70'}`}>{timing.amPm}</span>
                                                            </div>
                                                            <div className={`mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${isHighlighted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                {item.duration} min
                                                            </div>
                                                        </div>

                                                        {/* Card */}
                                                        <div className="w-[75%] pl-3 pr-3 md:pl-4 md:pr-4">
                                                            <div
                                                                onClick={() => {
                                                                    if (mode === 'edit') { setCurrentItem(item); setIsItemDialogOpen(true); }
                                                                }}
                                                                className={`
                                                                    rounded-xl p-4 border transition-all duration-200 relative overflow-hidden
                                                                    ${mode === 'edit' ? 'cursor-pointer hover:shadow-md hover:border-primary/20' : 'cursor-default'}
                                                                    ${snapshot.isDragging ? 'shadow-lg rotate-1 scale-[1.02]' : ''}
                                                                    ${isHighlighted
                                                                        ? 'bg-primary/5 dark:bg-primary/8 border-primary/20 shadow-sm shadow-primary/5 pulse-glow'
                                                                        : 'bg-card border-border/60 shadow-xs hover:shadow-sm'
                                                                    }
                                                                `}
                                                            >
                                                                {/* Active indicator bar */}
                                                                {isHighlighted && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full"></div>}

                                                                {/* Drag handle */}
                                                                {mode === 'edit' && (
                                                                    <div
                                                                        {...provided.dragHandleProps}
                                                                        className="absolute top-1.5 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted rounded-md z-20 transition-colors"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <DragHandleIcon style={{ fontSize: 16 }} />
                                                                    </div>
                                                                )}

                                                                <div className={`flex-1 flex flex-col ${mode === 'edit' ? 'mt-4' : ''}`}>
                                                                    <div className="flex items-start justify-between mb-1 relative z-10">
                                                                        <div className="min-w-0 flex-1">
                                                                            <h3 className={`text-[15px] font-bold leading-snug ${isHighlighted ? 'text-foreground' : 'text-foreground'}`}>
                                                                                {item.text}
                                                                            </h3>
                                                                            {item.location && (
                                                                                <div className="flex items-center gap-1 mt-1.5">
                                                                                    <LocationOnIcon style={{ fontSize: 14 }} className="text-primary/70" />
                                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">{item.location}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {mode === 'edit' && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setDeleteItemDialog({ open: true, itemId: item.id }); }}
                                                                                className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                                                                            >
                                                                                <DeleteIcon style={{ fontSize: 18 }} />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {item.remarks && (
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
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>

                                        {mode === 'edit' && (
                                            <div className="flex w-full mb-4 z-10 relative items-center">
                                                <div className="w-[25%]"></div>
                                                <div className="w-[75%] pl-3 pr-3 md:pl-4 md:pr-4">
                                                    <button
                                                        onClick={() => openAddAtIndex(index + 1)}
                                                        className="w-full h-9 flex items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 group active:scale-[0.98]"
                                                    >
                                                        <AddIcon className="text-[18px] group-hover:scale-110 transition-transform" />
                                                    </button>
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
                                    if (lastTiming && lastTiming.obj) {
                                        const endTimeObj = lastTiming.obj.clone().add(parseInt(lastItem.duration) || 0, 'minutes');
                                        return (
                                            <div className="flex w-full mt-4 mb-8 z-10 relative items-center justify-center">
                                                <div className="px-4 py-2 rounded-full bg-muted/50 border border-border/50 shadow-sm flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">End Time:</span>
                                                    <span className="text-sm font-bold text-primary tabular-nums tracking-wide">{endTimeObj.format("h:mm A")}</span>
                                                    <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            )}


                            {items.length === 0 && (
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

    // ── Desktop Sidebar ──
    const DesktopSidebar = () => (
        <aside className="hidden md:flex flex-col w-[260px] border-r border-border bg-sidebar pt-4 pb-4 justify-between h-screen sticky top-0">
            <div className="flex flex-col gap-1 px-3">
                {/* Back */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all mb-1"
                >
                    <ArrowBackIcon style={{ fontSize: 14 }} />
                    Dashboard
                </button>

                {/* Runsheet info */}
                <div className="px-3 py-3 mb-2">
                    <h1 className="text-base font-extrabold tracking-tight text-foreground leading-snug line-clamp-2" title={runsheet.name}>{runsheet.name}</h1>
                    <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                        <CalendarTodayIcon style={{ fontSize: 13 }} />
                        <span className="text-xs font-medium">{moment(runsheet.date).format("ddd, MMM D, YYYY")}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{items.length} items</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            {totalHours > 0 ? `${totalHours}h ${totalMins} min` : `${totalMins} min`}
                        </span>
                    </div>
                </div>

                {/* Nav */}
                <div className="flex flex-col gap-0.5">
                    <button
                        onClick={() => setActiveTab('runsheet')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'runsheet' ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        <CalendarViewDayIcon style={{ fontSize: 20 }} />
                        Runsheet
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'notes' ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        <ArticleIcon style={{ fontSize: 20 }} />
                        Notes
                    </button>
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'share' ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        <ShareIcon style={{ fontSize: 20 }} />
                        Share
                    </button>
                </div>
            </div>

            {/* Bottom section */}
            <div className="flex flex-col gap-3 px-4 pb-2">
                {/* Ops Mode panel */}
                {mode === 'ops' && (
                    <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
                        <div className="flex flex-col mb-3">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Current Time</span>
                            <div className="text-2xl font-mono font-bold text-foreground leading-none tracking-tight mt-1">
                                {clock.format("HH:mm:ss")}
                            </div>
                        </div>
                        <Button
                            onClick={handleLogTransition}
                            className="w-full shadow-sm active:scale-95 transition-all"
                            size="sm"
                        >
                            <UpdateIcon className="mr-2 h-4 w-4" />
                            Log Transition
                        </Button>
                    </div>
                )}
            </div>
        </aside>
    );

    return (
        <div className="relative flex h-full min-h-screen w-full flex-row overflow-hidden bg-background text-foreground">

            <DesktopSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full scrollbar-thin">
                <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col min-h-full pb-32 md:pb-12 md:pt-6 md:px-6">

                    {/* Common Headers */}
                    {(activeTab === 'runsheet' || activeTab === 'notes') && (
                        <>
                            {/* Mobile header */}
                            {renderMobileHeader()}

                            {/* Mobile runsheet info */}
                            <div className="md:hidden flex flex-col gap-1 px-5 pt-4 mb-4 page-enter">
                                <h1 className="text-[26px] leading-snug font-extrabold tracking-tight text-foreground line-clamp-2">{runsheet.name}</h1>
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
                                    <ModePills />
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col">
                                        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{runsheet.name}</h2>
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mt-1">
                                            <CalendarTodayIcon style={{ fontSize: 14 }} />
                                            {moment(runsheet.date).format("dddd, MMMM Do YYYY")}
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                                            {runsheet.time} Start
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                                            {items.length} items
                                        </div>
                                    </div>
                                    {isEditor && (
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
                            {renderRunsheetContent()}
                        </>
                    ) : activeTab === 'notes' ? (
                        <div className="page-enter px-4 md:px-0 mt-4 md:mt-0">
                            <NotesTab runsheet={runsheet} isEditor={isEditor} mode={mode} />
                        </div>
                    ) : activeTab === 'share' ? (
                        <div className="page-enter mt-2 md:mt-0">
                            <ShareTab
                                runsheetId={runsheet.id}
                                runsheetName={runsheet.name}
                                isEditor={isEditor}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {/* ── Bottom Dock - Mobile Only ── */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/30 pb-8 pt-3 px-6 shadow-xl">
                {/* Ops Mode Controls */}
                {mode === 'ops' && (
                    <div className="absolute bottom-full left-0 right-0 p-4 glass border-t border-border/30 flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Current Time</span>
                            <div className="text-xl font-mono font-bold text-foreground leading-none tracking-tight mt-0.5">
                                {clock.format("HH:mm:ss")}
                            </div>
                        </div>
                        <Button
                            onClick={handleLogTransition}
                            className="shadow-md shadow-primary/20 active:scale-95 rounded-xl"
                            size="sm"
                        >
                            <UpdateIcon className="mr-2 h-4 w-4" />
                            Log
                        </Button>
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
            {mode === 'view' && isEditor && activeTab === 'runsheet' && (
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
        </div>
    );
}
