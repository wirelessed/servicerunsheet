'use client';
import { useState, useEffect } from 'react';
import moment from 'moment';
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

// Note: Label is not added yet, I should add it.
// Actually shadcn @/components/ui/label usually needs to be added.
// I forgot to add 'label' in the 'add' command.

export default function RunsheetMetadataDialog({ open, onClose, onSubmit, initialData }) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');

    useEffect(() => {
        if (open) {
            setName(initialData ? initialData.name : '');
            const initialDate = initialData?.date && initialData?.time
                ? moment(`${initialData.date.split('T')[0]}T${moment(initialData.time, 'HHmm').format('HH:mm')}`).format('YYYY-MM-DDTHH:mm')
                : initialData?.date
                    ? moment(initialData.date).format('YYYY-MM-DDTHH:mm')
                    : moment().format('YYYY-MM-DDTHH:mm');

            setDate(initialDate);
        }
    }, [open, initialData]);

    const handleSubmit = () => {
        if (name.trim() && date) {
            const dateObj = moment(date);
            onSubmit({
                name: name,
                date: dateObj.format('YYYY-MM-DD'),
                time: dateObj.format('HHmm')
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Details' : 'New Runsheet'}</DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update the title and date of your runsheet.' : 'Create a new runsheet to start planning your event.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Runsheet Title</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Sunday Service"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date">Date & Time</Label>
                        <Input
                            id="date"
                            type="datetime-local"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || !date}>
                        {initialData ? 'Save' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
