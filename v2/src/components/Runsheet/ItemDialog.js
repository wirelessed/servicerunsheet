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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ItemDialog({ open, onClose, onSubmit, initialData }) {
    const [data, setData] = useState({ text: '', remarks: '', duration: '' });

    useEffect(() => {
        if (initialData) {
            setData({
                text: initialData.text || '',
                remarks: initialData.remarks || '',
                duration: initialData.duration || ''
            });
        } else {
            setData({ text: '', remarks: '', duration: '' });
        }
    }, [initialData, open]);

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        onSubmit(data);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
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
                    <div className="grid gap-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
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
                        <Label htmlFor="remarks">Remarks / Description</Label>
                        <Textarea
                            id="remarks"
                            name="remarks"
                            placeholder="e.g. Lead singer starts..."
                            value={data.remarks}
                            onChange={handleChange}
                            className="h-24"
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
