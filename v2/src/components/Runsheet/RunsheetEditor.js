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
import ShareDialog from './ShareDialog';
import RunsheetMetadataDialog from './RunsheetMetadataDialog';
import NotesTab from './NotesTab';
import ConfirmationDialog from '../ConfirmationDialog';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RunsheetEditor({ runsheet, initialProgramme }) {
    const { user } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState(initialProgramme);
    const [timings, setTimings] = useState({});
    const [now, setNow] = useState(moment());
    const [clock, setClock] = useState(moment()); // For real-time display
    const [isEditor, setIsEditor] = useState(false);

    // UI States
    const [mode, setMode] = useState('view'); // 'view', 'edit', 'ops'
    const [activeTab, setActiveTab] = useState('runsheet'); // 'runsheet', 'notes', 'share'

    // Dialogs
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState({ open: false, itemId: null });

    const calculateTimings = useCallback((programmeItems, startTimeStr) => {
        const dateStr = runsheet.date ? runsheet.date.split('T')[0] : moment().format('YYYY-MM-DD');
        let currentTime = moment(`${dateStr} ${startTimeStr}`, "YYYY-MM-DD HHmm");

        const newTimings = {};

        programmeItems.forEach(item => {
            newTimings[item.id] = {
                start: currentTime.format("h:mm"),
                amPm: currentTime.format("A"),
                obj: currentTime.clone()
            };
            const duration = parseInt(item.duration) || 0;
            currentTime.add(duration, 'minutes');
        });
        setTimings(newTimings);
    }, [runsheet.date]);

    useEffect(() => {
        // eslint-disable-next-line
        setItems(initialProgramme);
        calculateTimings(initialProgramme, runsheet.time);
    }, [initialProgramme, runsheet.time, calculateTimings]);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!user?.email) {
                setIsEditor(false);
                return;
            }
            try {
                const userRef = doc(db, `runsheets/${runsheet.id}/users`, user.email);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().role === 'editor') {
                    setIsEditor(true);
                } else {
                    setIsEditor(false);
                    setMode('view'); // Force view mode
                }
            } catch (error) {
                console.error("Error checking permissions:", error);
                setIsEditor(false);
            }
        };

        checkPermissions();
    }, [user, runsheet.id]);

    // Update current time every minute for highlighting
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(moment());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Update clock every second for Ops mode display
    useEffect(() => {
        const interval = setInterval(() => {
            setClock(moment());
        }, 1000);
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

        const newItems = reorder(
            items,
            result.source.index,
            result.destination.index
        );

        setItems(newItems);
        calculateTimings(newItems, runsheet.time);

        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
            const ref = doc(db, `runsheets/${runsheet.id}/programme`, item.id);
            batch.update(ref, { orderCount: index });
        });
        await batch.commit();
    };

    const handleAddItem = async (data) => {
        try {
            let insertIndex = items.length;
            if (currentItem && typeof currentItem.insertAtIndex === 'number') {
                insertIndex = currentItem.insertAtIndex;
            }

            const tempId = `temp-${Date.now()}`;
            const newNode = {
                id: tempId,
                text: data.text,
                remarks: data.remarks || '',
                duration: data.duration || 0,
                location: data.location || ''
            };

            const newItems = [...items];
            newItems.splice(insertIndex, 0, newNode);

            setItems(newItems);
            calculateTimings(newItems, runsheet.time);

            setIsItemDialogOpen(false);
            setCurrentItem(null);

            const { id, ...nodeData } = newNode;
            const docRef = await addDoc(collection(db, `runsheets/${runsheet.id}/programme`), nodeData);

            setItems(prevItems => prevItems.map(item =>
                item.id === tempId ? { ...item, id: docRef.id } : item
            ));

            const batch = writeBatch(db);
            newItems.forEach((item, index) => {
                const itemId = item.id === tempId ? docRef.id : item.id;
                const ref = doc(db, `runsheets/${runsheet.id}/programme`, itemId);
                batch.update(ref, { orderCount: index });
            });
            await batch.commit();

        } catch (error) {
            console.error("Error adding item:", error);
            alert(`Failed to save item: ${error.message}`);
        }
    };

    const handleEditItem = async (data) => {
        if (!currentItem || !currentItem.id) return;

        const updatedItems = items.map(item =>
            item.id === currentItem.id
                ? { ...item, text: data.text, remarks: data.remarks || '', duration: data.duration || 0, location: data.location || '' }
                : item
        );
        setItems(updatedItems);
        calculateTimings(updatedItems, runsheet.time);
        setIsItemDialogOpen(false);
        setCurrentItem(null);

        const ref = doc(db, `runsheets/${runsheet.id}/programme`, currentItem.id);
        await updateDoc(ref, {
            text: data.text,
            remarks: data.remarks || '',
            duration: data.duration || 0,
            location: data.location || ''
        });
    };

    const handleDeleteItem = async () => {
        if (!deleteItemDialog.itemId) return;

        const itemIdToDelete = deleteItemDialog.itemId;

        const newItems = items.filter(item => item.id !== itemIdToDelete);
        setItems(newItems);
        calculateTimings(newItems, runsheet.time);
        setDeleteItemDialog({ open: false, itemId: null });

        try {
            await deleteDoc(doc(db, `runsheets/${runsheet.id}/programme`, itemIdToDelete));
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    }

    const quickUpdateItem = async (itemId, updates) => {
        // Optimistic Update
        const updatedItems = items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        );
        setItems(updatedItems);
        calculateTimings(updatedItems, runsheet.time);

        try {
            const ref = doc(db, `runsheets/${runsheet.id}/programme`, itemId);
            await updateDoc(ref, updates);
        } catch (error) {
            console.error("Error updating item:", error);
        }
    };

    const handleLogTransition = () => {
        const currentMoment = moment();

        // Find active item based on current moment
        // We need to use the logic from isItemActive but with the precise currentMoment
        const activeItem = items.find(item => {
            const timing = timings[item.id];
            if (!timing || !timing.obj) return false;

            const startTime = timing.obj;
            const endTime = startTime.clone().add(parseInt(item.duration) || 0, 'minutes');

            return currentMoment.isSameOrAfter(startTime) && currentMoment.isBefore(endTime);
        });

        if (!activeItem) {
            return;
        }

        const timing = timings[activeItem.id];
        const startTime = timing.obj;
        // Calculate new duration (minutes)
        const diffMinutes = Math.max(1, Math.round(currentMoment.diff(startTime, 'minutes', true)));

        quickUpdateItem(activeItem.id, { duration: diffMinutes });
    };

    const handleMetadataUpdate = async (formData) => {
        const runsheetRef = doc(db, 'runsheets', runsheet.id);
        await updateDoc(runsheetRef, {
            name: formData.name,
            date: formData.date,
            time: formData.time,
            lastUpdated: moment().format()
        });
        setIsMetadataDialogOpen(false);
    };

    const openAddAtIndex = (index) => {
        setCurrentItem({ insertAtIndex: index });
        setIsItemDialogOpen(true);
    };

    const isItemActive = (item) => {
        const timing = timings[item.id];
        if (!timing || !timing.obj) return false;

        const startTime = timing.obj;
        const endTime = startTime.clone().add(parseInt(item.duration) || 0, 'minutes');

        return now.isSameOrAfter(startTime) && now.isBefore(endTime);
    };

    const renderHeader = () => (
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl px-4 pt-4 pb-2 border-transparent dark:border-white/5 transition-all">
            <div className="relative flex items-center justify-between md:justify-end">
                <button
                    onClick={() => router.back()}
                    className="flex size-12 items-center justify-center rounded-full bg-gray-100 dark:bg-surface-dark-high hover:bg-gray-200 dark:hover:bg-surface-highlight transition-all text-slate-900 dark:text-text-primary active:scale-95 z-50 md:hidden"
                >
                    <ArrowBackIcon className="text-2xl" />
                </button>

                {isEditor && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 md:hidden">
                        <div className="flex items-center gap-1 p-1 rounded-full bg-gray-100 dark:bg-surface-dark border border-gray-200 dark:border-white/5 shadow-sm">
                            {['view', 'edit', 'ops'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`
                                    px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all
                                    ${mode === m
                                            ? 'bg-white dark:bg-surface-highlight text-primary shadow-sm'
                                            : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                        }
                                `}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="flex size-12 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark-high text-slate-600 dark:text-text-primary transition-colors active:scale-95 outline-none"
                            >
                                <MoreVertIcon className="text-2xl" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {isEditor && (
                                <DropdownMenuItem onClick={() => setIsMetadataDialogOpen(true)}>
                                    Edit Name, Date & Start Time
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );

    const renderRunsheetContent = () => (
        <main className="flex-1 flex flex-col pt-2 pb-32 relative px-0">
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="programme" isDropDisabled={mode === 'view'} isDragDisabled={mode === 'view'}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="w-full">
                            {mode === 'edit' && (
                                <div className="flex w-full mb-6 z-10 relative items-center">
                                    <div className="w-[25%]"></div>
                                    <div className="w-[75%] pl-4 pr-4">
                                        <button
                                            onClick={() => openAddAtIndex(0)}
                                            className="w-full h-8 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary hover:bg-primary/5 transition-all duration-200 group active:scale-[0.98]"
                                        >
                                            <AddIcon className="text-[20px] group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {items.map((item, index) => {
                                const timing = timings[item.id] || { start: '--:--', amPm: '--' };
                                const isHighlighted = isItemActive(item);
                                const minHeight = Math.max(90, (parseInt(item.duration) || 0) * 4);

                                return (
                                    <div key={item.id}>
                                        <Draggable draggableId={item.id} index={index} isDragDisabled={mode !== 'edit'}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                // Drag handle logic applied to specific handle below
                                                >
                                                    <div className="flex w-full mb-2 z-10 relative group">
                                                        <div className="w-[25%] shrink-0 pt-4 text-right flex flex-col items-end pr-0">
                                                            <div className={`flex items-baseline gap-1 ${isHighlighted ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                                                <span className="text-xl font-bold leading-none">
                                                                    {timing.start}
                                                                </span>
                                                                <span className={`text-[10px] font-bold uppercase ${isHighlighted ? 'text-primary/80' : 'text-slate-400 dark:text-text-secondary'}`}>
                                                                    {timing.amPm}
                                                                </span>
                                                            </div>
                                                            <div className={`mt-2 px-1.5 py-0.5 rounded-sm text-xs font-bold ${isHighlighted ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-surface-dark-high text-slate-600 dark:text-text-secondary'}`}>
                                                                {item.duration}m
                                                            </div>
                                                        </div>

                                                        <div className="w-[75%] pl-4 pr-4">
                                                            <div
                                                                onClick={() => {
                                                                    if (mode === 'edit') {
                                                                        setCurrentItem(item);
                                                                        setIsItemDialogOpen(true);
                                                                    }
                                                                }}
                                                                style={{ minHeight: `${minHeight}px` }}
                                                                className={`rounded-lg p-4 shadow-sm border transition-all duration-200 active:scale-[0.98] flex flex-col relative
                                                                    ${mode === 'edit' ? 'cursor-default hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-default'}
                                                                    ${isHighlighted
                                                                        ? 'bg-primary-light/50 dark:bg-primary-container border-primary/20 overflow-hidden'
                                                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-transparent'
                                                                    }
                                                                `}
                                                            >
                                                                {isHighlighted && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}

                                                                {mode === 'edit' && (
                                                                    <div
                                                                        {...provided.dragHandleProps}
                                                                        className="absolute top-1 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 rounded z-20"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <DragHandleIcon fontSize="small" />
                                                                    </div>
                                                                )}

                                                                <div className={`flex-1 flex flex-col ${mode === 'edit' ? 'mt-4' : ''}`}>
                                                                    <div className="flex items-start justify-between mb-2 relative z-10">
                                                                        <div className="min-w-0 flex-1">
                                                                            <h3 className={`text-lg font-bold leading-tight truncate ${isHighlighted ? 'text-slate-900 dark:text-on-primary-container' : 'text-slate-900 dark:text-white'}`}>
                                                                                {item.text}
                                                                            </h3>
                                                                            {item.location && (
                                                                                <div className="flex items-center gap-1.5 mt-1 text-primary dark:text-blue-300">
                                                                                    <LocationOnIcon style={{ fontSize: 18 }} className="icon-filled" />
                                                                                    <span className="text-xs font-bold uppercase tracking-wide">{item.location}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {mode === 'edit' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDeleteItemDialog({ open: true, itemId: item.id });
                                                                                }}
                                                                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                                            >
                                                                                <DeleteIcon className="text-xl" />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {item.remarks && (
                                                                        <div
                                                                            className={`text-sm leading-relaxed mb-4 relative z-10 prose prose-sm max-w-none dark:prose-invert ${isHighlighted ? 'font-medium text-slate-700 dark:text-blue-100' : 'text-slate-500 dark:text-gray-400'}`}
                                                                            dangerouslySetInnerHTML={{ __html: item.remarks.replace(/\n/g, '<br />') }}
                                                                        />
                                                                    )}

                                                                    {isHighlighted && (
                                                                        <div className="absolute -bottom-6 -right-6 text-primary/5 dark:text-white/5 pointer-events-none">
                                                                            <GraphicEqIcon style={{ fontSize: 120 }} />
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
                                            <div className="flex w-full mb-6 z-10 relative items-center">
                                                <div className="w-[25%]"></div>
                                                <div className="w-[75%] pl-4 pr-4">
                                                    <button
                                                        onClick={() => openAddAtIndex(index + 1)}
                                                        className="w-full h-8 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary hover:bg-primary/5 transition-all duration-200 group active:scale-[0.98]"
                                                    >
                                                        <AddIcon className="text-[20px] group-hover:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {items.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <p>No items yet. Switch to Edit mode to add.</p>
                                </div>
                            )}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </main>
    )

    const handleItemSubmit = (data) => {
        if (currentItem && currentItem.id) {
            handleEditItem(data);
        } else {
            handleAddItem(data);
        }
    };

    const DesktopSidebar = () => (
        <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-surface-dark/30 pt-4 pb-4 justify-between h-screen sticky top-0">
            <div className="flex flex-col gap-2 px-3">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center justify-start gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors mb-2"
                >
                    <ArrowBackIcon style={{ fontSize: 16 }} />
                    Back to Dashboard
                </button>
                <div className="px-3 py-2 mb-2">
                    <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate" title={runsheet.name}>{runsheet.name}</h1>
                    <p className="text-xs font-medium text-slate-500 dark:text-text-secondary">{moment(runsheet.date).format("MMM D, YYYY")}</p>
                </div>

                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => setActiveTab('runsheet')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'runsheet'
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                            : 'text-slate-600 dark:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                    >
                        <CalendarViewDayIcon className="text-[20px]" />
                        Runsheet
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'notes'
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                            : 'text-slate-600 dark:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                    >
                        <ArticleIcon className="text-[20px]" />
                        Notes
                    </button>
                    <button
                        onClick={() => setIsShareDialogOpen(true)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    >
                        <ShareIcon className="text-[20px]" />
                        Share
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4 px-4 pb-4">
                {/* Ops Mode - Desktop Sidebar */}
                {mode === 'ops' && (
                    <div className="p-4 bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex flex-col mb-3">
                            <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-text-secondary tracking-wider">Current Time</span>
                            <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                                {clock.format("HH:mm:ss")}
                            </div>
                        </div>
                        <Button
                            onClick={handleLogTransition}
                            className="w-full bg-primary hover:bg-primary-dark text-white shadow-sm active:scale-95"
                            size="sm"
                        >
                            <UpdateIcon className="mr-2 h-4 w-4" />
                            Log
                        </Button>
                    </div>
                )}




            </div>
        </aside>
    );

    return (
        <div className="relative flex h-full min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">

            <DesktopSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative w-full">
                <div className="w-full max-w-md md:max-w-3xl mx-auto flex-1 flex flex-col min-h-full pb-32 md:pb-12 md:pt-8 md:px-6">

                    {/* Header - Hidden on Desktop sidebar since it's there, OR simplified? 
                        Let's keep the existing header but hide the back button/hamburger if needed.
                        For now, just using the existing flow.
                    */}

                    {activeTab === 'runsheet' ? (
                        <>
                            <div className="contents md:hidden">
                                {renderHeader()}
                            </div>
                            <div className="md:hidden flex flex-col gap-1 px-5 mb-4">
                                <span className="text-sm font-bold uppercase tracking-wider text-primary dark:text-primary">Runsheet</span>
                                <h1 className="text-[32px] leading-[40px] font-extrabold tracking-tight text-slate-900 dark:text-white truncate">{runsheet.name}</h1>
                                <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-text-secondary">
                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-surface-dark-high px-3 py-1 rounded-md">
                                        <CalendarTodayIcon style={{ fontSize: 18 }} />
                                        <span className="text-sm font-semibold">{moment(runsheet.date).format("ddd, MMM D")}</span>
                                    </div>
                                    <span className="text-sm font-medium">• {items.length} Items</span>
                                </div>
                            </div>
                            {/* Desktop Header equivalent if needed, or just rely on Sidebar title. 
                                Actually, the main document needs a header too for context scroll.
                                Let's show a simplified header on desktop or keep the existing one adapted.
                            */}
                            <div className="hidden md:block mb-6">
                                {/* Desktop specific top bar or just spacing? Let's use the existing header structure but cleaner */}
                                <div className="flex justify-center mb-6">
                                    <div className="flex items-center gap-1 p-1 rounded-full bg-gray-100 dark:bg-surface-dark border border-gray-200 dark:border-white/5 shadow-sm">
                                        {isEditor ? (
                                            ['view', 'edit', 'ops'].map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setMode(m)}
                                                    className={`
                                                    px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all
                                                    ${mode === m
                                                            ? 'bg-white dark:bg-surface-highlight text-primary shadow-sm'
                                                            : 'text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white'
                                                        }
                                                `}
                                                >
                                                    {m}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-1.5 text-[11px] font-bold uppercase text-slate-400">View Only</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col">
                                        <h2 className="text-3xl font-extrabold tracking-tight">{runsheet.name}</h2>
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-text-secondary text-sm font-medium">
                                            <CalendarTodayIcon style={{ fontSize: 16 }} />
                                            {moment(runsheet.date).format("dddd, MMMM Do YYYY")}
                                            <span className="mx-1">•</span>
                                            {runsheet.time} Start
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditor && (
                                            <Button variant="outline" size="sm" onClick={() => setIsMetadataDialogOpen(true)}>
                                                Edit Details
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <Separator className="my-4" />
                            </div>

                            {renderRunsheetContent()}
                        </>
                    ) : activeTab === 'notes' ? (
                        <>
                            <div className="md:hidden">
                                <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl px-4 py-4 border-b border-transparent dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setActiveTab('runsheet')} className="p-2 -ml-2 rounded-full hover:bg-muted"><ArrowBackIcon /></button>
                                        <h1 className="text-2xl font-bold dark:text-white">Notes</h1>
                                    </div>
                                </header>
                            </div>
                            <div className="hidden md:block mb-6">
                                <h2 className="text-3xl font-extrabold tracking-tight mb-4">Event Notes</h2>
                                <Separator className="my-4" />
                            </div>
                            <NotesTab runsheet={runsheet} />
                        </>
                    ) : null}
                </div>
            </div>

            {/* Bottom Dock - Mobile Only */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-transparent pb-8 pt-4 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                {/* Ops Mode Controls - Contextual */}
                {mode === 'ops' && (
                    <div className="absolute bottom-[calc(100%+0px)] left-0 right-0 p-4 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-white/5 flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-5">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-text-secondary tracking-wider">Current Time</span>
                            <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                                {clock.format("HH:mm:ss")}
                            </div>
                        </div>

                        <Button
                            onClick={handleLogTransition}
                            className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                            size="sm"
                        >
                            <UpdateIcon className="mr-2 h-4 w-4" />
                            Log Transition
                        </Button>
                    </div>
                )}

                <div className="flex items-center justify-between text-slate-400 dark:text-text-secondary px-6">
                    <button
                        onClick={() => setActiveTab('runsheet')}
                        className={`flex flex-col items-center gap-1.5 transition-colors active:scale-95 ${activeTab === 'runsheet' ? 'text-primary dark:text-primary' : 'hover:text-slate-900 dark:hover:text-white group'}`}
                    >
                        <div className={`px-5 py-1 rounded-full ${activeTab === 'runsheet' ? 'bg-primary/10 dark:bg-primary/20' : ''}`}>
                            <CalendarViewDayIcon className={activeTab === 'runsheet' ? "text-[26px] icon-filled" : "text-[26px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[11px] font-bold">Runsheet</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex flex-col items-center gap-1.5 transition-colors active:scale-95 ${activeTab === 'notes' ? 'text-primary dark:text-primary' : 'hover:text-slate-900 dark:hover:text-white group'}`}
                    >
                        <div className={`px-5 py-1 rounded-full ${activeTab === 'notes' ? 'bg-primary/10 dark:bg-primary/20' : ''}`}>
                            <ArticleIcon className={activeTab === 'notes' ? "text-[26px] icon-filled" : "text-[26px] group-hover:-translate-y-0.5 transition-transform"} />
                        </div>
                        <span className="text-[11px] font-bold">Notes</span>
                    </button>
                    <button
                        onClick={() => setIsShareDialogOpen(true)}
                        className="flex flex-col items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95 group"
                    >
                        <div className="px-5 py-1">
                            <ShareIcon className="text-[26px] group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                        <span className="text-[11px] font-bold">Share</span>
                    </button>
                </div>
            </div>

            {/* FAB - Only in Edit Mode */}
            {mode === 'edit' && (
                <div className="fixed bottom-28 right-[calc(50%-224px+24px)] md:right-10 md:bottom-10 z-50">
                    <button
                        onClick={() => openAddAtIndex(items.length)}
                        className="flex items-center justify-center size-[64px] rounded-[18px] bg-primary dark:bg-primary text-white shadow-elevation-3 hover:shadow-lg hover:scale-105 transition-all duration-300 active:scale-95 group"
                    >
                        <AddIcon className="text-[32px] group-hover:rotate-90 transition-transform" />
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

            <ShareDialog
                open={isShareDialogOpen}
                onClose={() => setIsShareDialogOpen(false)}
                runsheetId={runsheet.id}
                runsheetName={runsheet.name}
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
