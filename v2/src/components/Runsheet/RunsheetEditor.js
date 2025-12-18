'use client';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddIcon from '@mui/icons-material/Add';
import moment from 'moment';
import { doc, updateDoc, writeBatch, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ItemDialog from './ItemDialog';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArticleIcon from '@mui/icons-material/Article';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import ShareDialog from './ShareDialog';
import RunsheetMetadataDialog from './RunsheetMetadataDialog';
import NotesTab from './NotesTab';
import ConfirmationDialog from '../ConfirmationDialog';

export default function RunsheetEditor({ runsheet, initialProgramme }) {
    const [items, setItems] = useState(initialProgramme);
    const [timings, setTimings] = useState({});

    // UI States
    const [mode, setMode] = useState('view'); // 'view', 'edit', 'ops'
    const [activeTab, setActiveTab] = useState('runsheet'); // 'runsheet', 'notes', 'share'

    // Dialogs
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState({ open: false, itemId: null });

    useEffect(() => {
        setItems(initialProgramme);
        calculateTimings(initialProgramme, runsheet.time);
    }, [initialProgramme, runsheet.time]);

    const calculateTimings = (programmeItems, startTimeStr) => {
        let currentTime = moment(startTimeStr, "HHmm");
        const newTimings = {};

        programmeItems.forEach(item => {
            newTimings[item.id] = currentTime.format("h:mm a");
            const duration = parseInt(item.duration) || 0;
            currentTime.add(duration, 'minutes');
        });
        setTimings(newTimings);
    };

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
        // Find insert index if currentItem was a placeholder (not applicable in this simple Add flow, usually append)
        // For "Insert Row" feature:
        let insertIndex = items.length;
        if (currentItem && currentItem.insertAtIndex !== undefined) {
            insertIndex = currentItem.insertAtIndex;
        }

        const newNode = {
            text: data.text,
            remarks: data.remarks || '',
            duration: data.duration || 0,
            // Temporary orderCount, will reindex after
        };

        const docRef = await addDoc(collection(db, `runsheets/${runsheet.id}/programme`), newNode);

        // Re-index everything
        // Ideally we do this optimistically, but for now fetch refetch handles it or we manually splice
        // Simple append for now unless we do complex reordering logic
        // To support "Insert Between": we need to shift indices. 
        // Let's rely on `items` state splice and batch update.

        if (currentItem && currentItem.insertAtIndex !== undefined) {
            const newItems = [...items];
            newItems.splice(insertIndex, 0, { id: docRef.id, ...newNode });

            const batch = writeBatch(db);
            newItems.forEach((item, index) => {
                const ref = doc(db, `runsheets/${runsheet.id}/programme`, item.id);
                batch.update(ref, { orderCount: index });
            });
            await batch.commit();
        } else {
            // Just append
            await updateDoc(doc(db, `runsheets/${runsheet.id}/programme`, docRef.id), { orderCount: insertIndex });
        }

        setIsItemDialogOpen(false);
        setCurrentItem(null);
    };

    const handleEditItem = async (data) => {
        if (!currentItem || !currentItem.id) return; // create mode handled above
        const ref = doc(db, `runsheets/${runsheet.id}/programme`, currentItem.id);
        await updateDoc(ref, {
            text: data.text,
            remarks: data.remarks || '',
            duration: data.duration || 0
        });
        setIsItemDialogOpen(false);
        setCurrentItem(null);
    };

    const handleDeleteItem = async () => {
        if (!deleteItemDialog.itemId) return;
        try {
            await deleteDoc(doc(db, `runsheets/${runsheet.id}/programme`, deleteItemDialog.itemId));
            setDeleteItemDialog({ open: false, itemId: null });
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    }

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

    // Render Logic
    const renderRunsheetContent = () => (
        <div className="card w-full bg-base-100 shadow-xl mb-4">
            <div className="card-body p-0">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="programme" isDropDisabled={mode !== 'edit'}>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-base-200">
                                {items.map((item, index) => (
                                    <div key={item.id} className="group relative">
                                        {/* Insert Button (Top of item) - Only in Edit Mode */}
                                        {mode === 'edit' && (
                                            <div className="absolute -top-3 left-0 right-0 h-6 flex justify-center items-center opacity-0 group-hover:opacity-100 z-10 hover:opacity-100 transition-opacity">
                                                <button
                                                    className="btn btn-xs btn-circle btn-primary shadow-md"
                                                    onClick={() => openAddAtIndex(index)}
                                                    title="Insert Row"
                                                >
                                                    <AddIcon fontSize="small" />
                                                </button>
                                            </div>
                                        )}

                                        <Draggable draggableId={item.id} index={index} isDragDisabled={mode !== 'edit'}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex items-start p-4 ${snapshot.isDragging ? 'bg-base-200 shadow-lg' : 'bg-base-100'} hover:bg-base-50 transition-colors`}
                                                >
                                                    {/* Drag Handle (Left) */}
                                                    {mode === 'edit' && (
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="mr-3 mt-1 text-base-content/30 hover:text-base-content cursor-grab active:cursor-grabbing"
                                                        >
                                                            <DragIndicatorIcon />
                                                        </div>
                                                    )}

                                                    {/* Time & Duration */}
                                                    <div className="min-w-[80px] mr-4 text-right flex-shrink-0">
                                                        <p className="font-bold text-sm text-primary">
                                                            {timings[item.id]}
                                                        </p>
                                                        <p className="text-xs text-base-content/50">
                                                            {item.duration} min
                                                        </p>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-grow min-w-0 pr-2">
                                                        <p className="whitespace-pre-line text-sm font-medium">{item.text}</p>
                                                        {item.remarks && (
                                                            <p className="whitespace-pre-line text-xs text-base-content/60 mt-1 italic">{item.remarks}</p>
                                                        )}
                                                    </div>

                                                    {/* Edit Controls (Right) */}
                                                    {mode === 'edit' && (
                                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                className="btn btn-ghost btn-xs btn-square"
                                                                onClick={() => { setCurrentItem(item); setIsItemDialogOpen(true); }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-xs btn-square text-error"
                                                                onClick={() => setDeleteItemDialog({ open: true, itemId: item.id })}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    </div>
                                ))}
                                {provided.placeholder}

                                {/* Append Button at bottom */}
                                {mode === 'edit' && (
                                    <div className="p-4 flex justify-center">
                                        <button className="btn btn-outline btn-sm w-full border-dashed" onClick={() => openAddAtIndex(items.length)}>
                                            <AddIcon /> Add Item
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </div>
    );

    return (
        <div className="pb-32">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold leading-tight">{runsheet.name}</h2>
                            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setIsMetadataDialogOpen(true)}>
                                <EditIcon fontSize="small" />
                            </button>
                        </div>
                        <p className="text-base-content/70 text-sm">
                            {moment(runsheet.date).format("dddd, D MMMM YYYY")} • {moment(runsheet.time, "HHmm").format("h:mm a")}
                        </p>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="flex justify-center">
                    <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1 w-full max-w-md grid grid-cols-3">
                        <a role="tab" className={`tab ${mode === 'view' ? 'tab-active' : ''}`} onClick={() => setMode('view')}>View</a>
                        <a role="tab" className={`tab ${mode === 'edit' ? 'tab-active' : ''}`} onClick={() => setMode('edit')}>Edit</a>
                        <a role="tab" className={`tab ${mode === 'ops' ? 'tab-active' : ''}`} onClick={() => setMode('ops')}>Ops</a>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'runsheet' && renderRunsheetContent()}
            {activeTab === 'notes' && <NotesTab runsheet={runsheet} />}

            {/* Bottom Dock */}
            <div className="btm-nav btm-nav-lg bg-base-100 shadow-2xl border-t border-base-200 z-50">
                <button
                    className={`${activeTab === 'runsheet' ? 'active text-primary' : ''}`}
                    onClick={() => setActiveTab('runsheet')}
                >
                    <ArticleIcon />
                    <span className="btm-nav-label text-xs">Runsheet</span>
                </button>
                <button
                    className={`${activeTab === 'notes' ? 'active text-primary' : ''}`}
                    onClick={() => setActiveTab('notes')}
                >
                    <NoteAltIcon />
                    <span className="btm-nav-label text-xs">Notes</span>
                </button>
                <button
                    className={`${activeTab === 'share' ? 'active text-primary' : ''}`}
                    onClick={() => setIsShareDialogOpen(true)}
                >
                    <ShareIcon />
                    <span className="btm-nav-label text-xs">Share</span>
                </button>
            </div>

            {/* Dialogs */}
            <ItemDialog
                open={isItemDialogOpen}
                onClose={() => setIsItemDialogOpen(false)}
                onSubmit={currentItem && !currentItem.insertAtIndex ? handleEditItem : handleAddItem}
                initialData={currentItem && !currentItem.insertAtIndex ? currentItem : null}
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
                message="Are you sure you want to delete this item?"
                confirmText="Delete"
            />
        </div>
    );
}
