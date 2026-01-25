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
            setData({
                text: initialData.text || '',
                remarks: initialData.remarks || '',
                duration: initialData.duration || '',
                location: initialData.location || ''
            });
        } else {
            setData({ text: '', remarks: '', duration: '', location: '' });
        }
    }, [initialData, open]);

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        if (onSubmit) onSubmit(data);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Item' : 'Add Item'}</DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update item details here.' : 'Enter the details for the new runsheet item.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="text">Item Title</Label>
                        <Input
                            id="text"
                            name="text"
                            placeholder="e.g. Opening Song"
                            value={data.text}
                            onChange={handleChange}
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="duration">Duration (min)</Label>
                            <Input
                                id="duration"
                                name="duration"
                                type="number"
                                placeholder="5"
                                value={data.duration}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                name="location"
                                placeholder="Main Stage"
                                value={data.location}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="remarks">Remarks / Description</Label>
                        <MinimalTiptapEditor
                            value={data.remarks}
                            onChange={(val) => setData({ ...data, remarks: val })}
                            className="w-full border-input shadow-xs"
                            editorContentClassName="p-3 h-32 overflow-y-auto"
                            output="html"
                            placeholder="e.g. Lead singer starts..."
                            editable={true}
                            editorClassName="focus:outline-hidden"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Item</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
