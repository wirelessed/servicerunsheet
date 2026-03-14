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
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap/minimal-tiptap";


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
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">{initialData ? 'edit_note' : 'add_circle'}</span>
                        {initialData ? 'Edit Item' : 'Add Item'}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update item details.' : 'Enter the details for the new programme item.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
                                placeholder="5"
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
                                placeholder="Main Stage"
                                value={data.location}
                                onChange={handleChange}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="remarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks / Description</Label>
                        <MinimalTiptapEditor
                            value={data.remarks}
                            onChange={(val) => setData({ ...data, remarks: val })}
                            className="w-full border-input shadow-xs rounded-xl"
                            editorContentClassName="p-3 h-32 overflow-y-auto prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5 prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal"
                            output="html"
                            placeholder="e.g. Lead singer starts..."
                            editable={true}
                            editorClassName="focus:outline-hidden"
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
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
