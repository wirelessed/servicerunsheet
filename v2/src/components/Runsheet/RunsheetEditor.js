'use client';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddIcon from '@mui/icons-material/Add';
import moment from 'moment';
import { doc, updateDoc, writeBatch, collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ItemDialog from './ItemDialog';
import EditIcon from '@mui/icons-material/Edit';
import ShareDialog from './ShareDialog';
import ShareIcon from '@mui/icons-material/Share';

export default function RunsheetEditor({ runsheet, initialProgramme }) {
    const [items, setItems] = useState(initialProgramme);
    const [timings, setTimings] = useState({});
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null); // For editing
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

    useEffect(() => {
        setItems(initialProgramme);
        calculateTimings(initialProgramme, runsheet.time);
    }, [initialProgramme, runsheet.time]);

    const calculateTimings = (programmeItems, startTimeStr) => {
        // startTimeStr like "1000" or "HHmm"
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
        if (!result.destination) {
            return;
        }

        const newItems = reorder(
            items,
            result.source.index,
            result.destination.index
        );

        setItems(newItems);
        calculateTimings(newItems, runsheet.time);

        // Update DB
        const batch = writeBatch(db);
        newItems.forEach((item, index) => {
            const ref = doc(db, `runsheets/${runsheet.id}/programme`, item.id);
            batch.update(ref, { orderCount: index });
        });
        await batch.commit();
    };

    const handleAddItem = async (data) => {
        // Add to Firestore
        const newOrderInfo = items.length;
        await addDoc(collection(db, `runsheets/${runsheet.id}/programme`), {
            text: data.text,
            remarks: data.remarks || '',
            duration: data.duration || 0,
            orderCount: newOrderInfo
        });
        setIsItemDialogOpen(false);
    };

    const handleEditItem = async (data) => {
        if (!currentItem) return;
        const ref = doc(db, `runsheets/${runsheet.id}/programme`, currentItem.id);
        await updateDoc(ref, {
            text: data.text,
            remarks: data.remarks || '',
            duration: data.duration || 0
        });
        setIsItemDialogOpen(false);
        setCurrentItem(null);
    };

    const openAdd = () => {
        setCurrentItem(null);
        setIsItemDialogOpen(true);
    }

    const openEdit = (item) => {
        setCurrentItem(item);
        setIsItemDialogOpen(true);
    }

    return (
        <div className="pb-24">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold">{runsheet.name}</h2>
                    <p className="text-base-content/70">
                        {moment(runsheet.date).format("dddd, D MMMM YYYY")} • {moment(runsheet.time, "HHmm").format("h:mm a")}
                    </p>
                </div>
                <button className="btn btn-ghost btn-circle" onClick={() => setIsShareDialogOpen(true)}>
                    <ShareIcon />
                </button>
            </div>

            <div className="card w-full bg-base-100 shadow-xl">
                <div className="card-body p-0">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="programme">
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-base-200">
                                    {items.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                    }}
                                                    className={`flex items-start p-4 ${snapshot.isDragging ? 'bg-base-200' : 'bg-base-100'}`}
                                                >
                                                    <div className="min-w-[80px] mr-4 text-right">
                                                        <p className="font-bold text-sm">
                                                            {timings[item.id]}
                                                        </p>
                                                        <p className="text-xs text-base-content/50">
                                                            {item.duration} min
                                                        </p>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="whitespace-pre-line text-sm">{item.text}</p>
                                                        <p className="whitespace-pre-line text-xs text-base-content/60">{item.remarks}</p>
                                                    </div>
                                                    <button className="btn btn-ghost btn-xs btn-circle" onClick={() => openEdit(item)}>
                                                        <EditIcon fontSize="small" />
                                                    </button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </div>

            <button
                className="btn btn-circle btn-primary btn-lg fixed bottom-8 right-8 shadow-lg z-50"
                onClick={openAdd}
            >
                <AddIcon />
            </button>

            <ItemDialog
                open={isItemDialogOpen}
                onClose={() => setIsItemDialogOpen(false)}
                onSubmit={currentItem ? handleEditItem : handleAddItem}
                initialData={currentItem}
            />

            <ShareDialog
                open={isShareDialogOpen}
                onClose={() => setIsShareDialogOpen(false)}
                runsheetId={runsheet.id}
                runsheetName={runsheet.name}
            />
        </div>
    );
}
