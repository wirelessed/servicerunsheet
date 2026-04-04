import React, { useState, useMemo } from 'react';
import { Grid, Willow, WillowDark } from '@svar-ui/react-grid';
import '@svar-ui/react-grid/all.css';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import DeleteIcon from '@mui/icons-material/Delete';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function AdvancedGrid({
    items,
    timings,
    theme,
    runsheetId,
    runsheetTime,
    setItems,
    calculateTimings,
    quickUpdateItem,
    setCurrentItem,
    setIsItemDialogOpen,
    setDeleteItemDialog
}) {
    const [gridApi, setGridApi] = useState(null);

    const handleGridAction = (action, data) => {
        if (action === "update-cell") {
            const { id, column, value } = data;
            if (id && column) {
                quickUpdateItem(id, { [column]: value });
            }
        }
    };

    const gridItems = useMemo(() => items.map(item => ({
        ...item,
        __timeStart: timings[item.id] ? timings[item.id].start : '',
        __timeAmPm: timings[item.id] ? timings[item.id].amPm : ''
    })), [items, timings]);

    const advancedColumns = useMemo(() => [
        {
            id: "drag",
            header: "",
            width: 40,
            draggable: true,
            cell: () => (
                <div className="flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors">
                    <DragHandleIcon style={{ fontSize: 18 }} />
                </div>
            )
        },
        {
            id: "time",
            header: "Time",
            width: 90,
            resize: true,
            cell: ({ row }) => {
                return <div className="font-mono text-[13px] text-primary font-semibold h-full flex items-center pl-2">{row.__timeStart} <span className="text-[10px] ml-0.5 text-primary/70">{row.__timeAmPm}</span></div>;
            }
        },
        { id: "text", header: "Item Title", width: 250, editor: "text", resize: true, flexgrow: 1 },
        { id: "duration", header: "Duration (m)", width: 100, editor: "text", resize: true },
        { id: "location", header: "Location", width: 150, editor: "text", resize: true },
        {
            id: "remarks",
            header: "Description",
            flexgrow: 2,
            resize: true,
            cell: ({ row }) => {
                const plainText = row.remarks ? row.remarks.replace(/<[^>]+>/g, '') : '';
                return (
                    <div
                        onClick={(e) => { e.stopPropagation(); setCurrentItem(row); setIsItemDialogOpen(true); }}
                        className="flex justify-between items-center w-full h-full group cursor-pointer hover:bg-muted/10 px-2 transition-colors"
                    >
                        <span className="truncate mr-2 text-muted-foreground text-[13px]">{plainText || <span className="text-muted-foreground/50 italic">Click to add description...</span>}</span>
                        <div
                            className="p-1 text-muted-foreground hover:text-primary transition-colors bg-background/50 rounded"
                        >
                            <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        </div>
                    </div>
                );
            }
        },
        {
            id: "actions",
            header: "",
            width: 50,
            cell: ({ row }) => (
                <div className="flex items-center justify-center w-full h-full">
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteItemDialog({ open: true, itemId: row.id }); }}
                        className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                    >
                        <DeleteIcon style={{ fontSize: 16 }} />
                    </button>
                </div>
            )
        }
    ], [setIsItemDialogOpen, setCurrentItem, setDeleteItemDialog]);

    const renderGrid = () => (
        <Grid
            data={gridItems}
            columns={advancedColumns}
            rowHeight={48}
            reorder={true}
            cellStyle={() => "border-r border-b border-border/30"}
            init={(api) => {
                setGridApi(api);
                api.on("update-cell", (ev) => handleGridAction("update-cell", ev));
                api.on("move-item", async (ev) => {
                    if (ev.inProgress) return;
                    const state = api.getState();
                    if (state && state.data) {
                        setTimeout(async () => {
                            const newOrder = api.getState().data;
                            setItems(newOrder);
                            calculateTimings(newOrder, runsheetTime);
                            const batch = writeBatch(db);
                            newOrder.forEach((item, index) => {
                                batch.update(doc(db, `runsheets/${runsheetId}/programme`, item.id), { orderCount: index });
                            });
                            await batch.commit();
                        }, 100);
                    }
                });
            }}
        />
    );

    return (
        <div className="w-full flex-1 min-h-0 border border-border/50 rounded-xl shadow-sm bg-card overflow-x-hidden overflow-y-auto">
            <div className="relative">
                {theme === 'dark' ? (
                    <WillowDark className="w-full">{renderGrid()}</WillowDark>
                ) : (
                    <Willow className="w-full">{renderGrid()}</Willow>
                )}
            </div>
        </div>
    );
}
