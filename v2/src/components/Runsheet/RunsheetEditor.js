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

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
        let insertIndex = items.length;
        if (currentItem && currentItem.insertAtIndex !== undefined) {
            insertIndex = currentItem.insertAtIndex;
        }

        const newNode = {
            text: data.text,
            remarks: data.remarks || '',
            duration: data.duration || 0,
        };

        const docRef = await addDoc(collection(db, `runsheets/${runsheet.id}/programme`), newNode);

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
            await updateDoc(doc(db, `runsheets/${runsheet.id}/programme`, docRef.id), { orderCount: insertIndex });
        }

        setIsItemDialogOpen(false);
        setCurrentItem(null);
    };

    const handleEditItem = async (data) => {
        if (!currentItem || !currentItem.id) return;
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

    const renderRunsheetContent = () => (
        <Card className="shadow-lg border-muted/60 mb-8 overflow-hidden">
            <CardContent className="p-0">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="programme" isDropDisabled={mode !== 'edit'}>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col">
                                {items.map((item, index) => (
                                    <div key={item.id} className="group relative">
                                        {/* Insert Button (Top of item) - Only in Edit Mode */}
                                        {mode === 'edit' && (
                                            <div className="absolute -top-[13px] left-0 right-0 h-6 flex justify-center items-center opacity-0 group-hover:opacity-100 z-10 transition-opacity">
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-6 w-6 rounded-full shadow-sm hover:scale-110"
                                                    onClick={() => openAddAtIndex(index)}
                                                >
                                                    <AddIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}

                                        <Draggable draggableId={item.id} index={index} isDragDisabled={mode !== 'edit'}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex items-start p-5 ${snapshot.isDragging ? 'bg-muted/80 shadow-2xl z-20 scale-[1.02]' : 'bg-background hover:bg-muted/30'} transition-all`}
                                                >
                                                    {/* Drag Handle (Left) */}
                                                    {mode === 'edit' && (
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="mr-4 mt-1 text-muted-foreground/40 hover:text-primary cursor-grab active:cursor-grabbing"
                                                        >
                                                            <DragIndicatorIcon />
                                                        </div>
                                                    )}

                                                    {/* Time & Duration */}
                                                    <div className="min-w-[90px] mr-6 text-right flex-shrink-0">
                                                        <p className="font-extrabold text-sm text-primary tracking-tight">
                                                            {timings[item.id]}
                                                        </p>
                                                        <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                                            {item.duration} MIN
                                                        </p>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-grow min-w-0 pr-4">
                                                        <p className="whitespace-pre-line text-[15px] font-semibold tracking-tight text-foreground/90">{item.text}</p>
                                                        {item.remarks && (
                                                            <p className="whitespace-pre-line text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium italic">{item.remarks}</p>
                                                        )}
                                                    </div>

                                                    {/* Edit Controls (Right) */}
                                                    {mode === 'edit' && (
                                                        <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => { setCurrentItem(item); setIsItemDialogOpen(true); }}
                                                            >
                                                                <EditIcon className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => setDeleteItemDialog({ open: true, itemId: item.id })}
                                                            >
                                                                <DeleteIcon className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                        {index < items.length - 1 && <Separator className="bg-muted/60" />}
                                    </div>
                                ))}
                                {provided.placeholder}

                                {mode === 'edit' && (
                                    <div className="p-6 flex justify-center bg-muted/10 border-t border-dashed">
                                        <Button variant="outline" className="w-full border-dashed" onClick={() => openAddAtIndex(items.length)}>
                                            <AddIcon className="mr-2 h-4 w-4" /> Add Item
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </CardContent>
        </Card>
    );

    return (
        <div className="pb-36">
            <div className="flex flex-col gap-8 mb-8">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-extrabold tracking-tighter leading-none">{runsheet.name}</h2>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsMetadataDialogOpen(true)}>
                                <EditIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-muted-foreground font-medium text-sm">
                            {moment(runsheet.date).format("dddd, D MMMM YYYY")} • <span className="text-primary/70">{moment(runsheet.time, "HHmm").format("h:mm a")}</span>
                        </p>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Tabs value={mode} onValueChange={setMode} className="w-full max-w-md">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="view">View</TabsTrigger>
                            <TabsTrigger value="edit">Edit</TabsTrigger>
                            <TabsTrigger value="ops">Ops</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {activeTab === 'runsheet' && renderRunsheetContent()}
            {activeTab === 'notes' && <NotesTab runsheet={runsheet} />}

            {/* Dock Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
                <div className="container max-w-2xl mx-auto flex justify-center">
                    <Card className="flex items-center gap-2 p-1.5 backdrop-blur-md bg-background/80 border-muted/50 shadow-2xl pointer-events-auto rounded-full">
                        <Button
                            variant={activeTab === 'runsheet' ? 'default' : 'ghost'}
                            className="rounded-full gap-2 px-6 h-12"
                            onClick={() => setActiveTab('runsheet')}
                        >
                            <ArticleIcon className="h-5 w-5" />
                            <span className="font-semibold text-xs">Runsheet</span>
                        </Button>
                        <Button
                            variant={activeTab === 'notes' ? 'default' : 'ghost'}
                            className="rounded-full gap-2 px-6 h-12"
                            onClick={() => setActiveTab('notes')}
                        >
                            <NoteAltIcon className="h-5 w-5" />
                            <span className="font-semibold text-xs">Notes</span>
                        </Button>
                        <Separator orientation="vertical" className="h-8 mx-1" />
                        <Button
                            variant="ghost"
                            className="rounded-full gap-2 px-6 h-12 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsShareDialogOpen(true)}
                        >
                            <ShareIcon className="h-5 w-5" />
                            <span className="font-semibold text-xs">Share</span>
                        </Button>
                    </Card>
                </div>
            </div>

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
                message="Are you sure you want to delete this item? This action will remove it from the programme."
                confirmText="Delete"
                confirmStyle="destructive"
            />
        </div>
    );
}
