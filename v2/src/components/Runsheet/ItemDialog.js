'use client';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

const MinimalTiptapEditor = dynamic(
    () => import('@/components/ui/minimal-tiptap/minimal-tiptap').then(mod => mod.MinimalTiptapEditor),
    { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded-md w-full" /> }
);


export default function ItemDialog({ open, onClose, onSubmit, initialData }) {
    const [data, setData] = useState({ text: '', remarks: '', duration: '', location: '' });

    useEffect(() => {
        if (initialData) {
            setData({ text: initialData.text || '', remarks: initialData.remarks || '', duration: initialData.duration || '', location: initialData.location || '' });
        } else {
            setData({ text: '', remarks: '', duration: '', location: '' });
        }
    }, [initialData, open]);

    const handleChange = (e) => setData({ ...data, [e.target.name]: e.target.value });
    const handleSubmit = () => { if (onSubmit) onSubmit(data); };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[700px] w-full h-[100dvh] sm:h-auto !rounded-none sm:!rounded-2xl border-0 sm:border p-0 sm:p-6 flex flex-col gap-0 [&>button.absolute]:hidden sm:[&>button.absolute]:flex max-h-[100dvh] overflow-hidden">
                {/* Desktop Header */}
                <DialogHeader className="hidden sm:block shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">{initialData ? 'edit_note' : 'add_circle'}</span>
                        {initialData ? 'Edit Item' : 'Add Item'}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update item details.' : 'Enter the details for the new programme item.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto w-full min-h-0 relative">
                    {/* Mobile Header (Sticky) */}
                    <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b sm:hidden bg-card z-50">
                        <button onClick={onClose} className="flex p-2 -ml-2 text-muted-foreground hover:text-foreground items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-2xl">close</span>
                        </button>
                        <span className="font-bold text-base">{initialData ? 'Edit Item' : 'Add Item'}</span>
                        <Button onClick={handleSubmit} size="sm" className="h-8 rounded-full px-4 text-xs font-semibold shadow-none">Save</Button>
                    </div>

                    <div className="grid gap-4 p-4 sm:p-0 sm:py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="text" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Title</Label>
                            <Input
                                id="text"
                                name="text"
                                placeholder="e.g. Opening Song"
                                value={data.text}
                                onChange={handleChange}
                                autoFocus
                                className="rounded-xl h-11 text-base"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
                                <Input
                                    id="duration"
                                    name="duration"
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={data.duration}
                                    onChange={handleChange}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    placeholder="e.g. Main Stage"
                                    value={data.location}
                                    onChange={handleChange}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2 flex-grow flex flex-col min-h-0">
                            <Label htmlFor="remarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Remarks / Description</Label>
                            <div className="touch-auto" style={{ WebkitUserSelect: 'text', userSelect: 'text' }}>
                                <MinimalTiptapEditor
                                    value={data.remarks}
                                    onChange={(val) => setData({ ...data, remarks: val })}
                                    className="w-full border-input shadow-xs rounded-xl flex-grow flex flex-col min-h-[200px]"
                                    editorContentClassName="p-3 flex-grow overflow-y-auto prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5 prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal"
                                    output="html"
                                    placeholder="e.g. Lead singer starts..."
                                    editable={true}
                                    editorClassName="focus:outline-hidden touch-auto select-text"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Footer */}
                <DialogFooter className="gap-2 hidden sm:flex shrink-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleSubmit} className="rounded-xl shadow-sm">
                        <span className="material-symbols-outlined text-sm mr-1.5">save</span>
                        Save Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
