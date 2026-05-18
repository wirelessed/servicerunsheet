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

export default function RunsheetMetadataDialog({ open, onClose, onSubmit, initialData, isLoading, groups = [], activeFilter = null }) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [groupId, setGroupId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setName(initialData ? initialData.name : '');
            const initialDate = initialData?.date && initialData?.time
                ? moment(`${initialData.date.split('T')[0]}T${moment(initialData.time, 'HHmm').format('HH:mm')}`).format('YYYY-MM-DDTHH:mm')
                : initialData?.date
                    ? moment(initialData.date).format('YYYY-MM-DDTHH:mm')
                    : moment().format('YYYY-MM-DDTHH:mm');
            setDate(initialDate);
            
            if (!initialData && activeFilter && !['upcoming', 'past', 'archive'].includes(activeFilter)) {
                setGroupId(activeFilter);
            } else {
                setGroupId('');
            }
            
            setIsSubmitting(false);
        }
    }, [open, initialData, activeFilter]);

    const handleSubmit = () => {
        if (!name.trim() || !date || isSubmitting) return;
        setIsSubmitting(true);
        const dateObj = moment(date);
        onSubmit({ 
            name, 
            date: dateObj.format('YYYY-MM-DD'), 
            time: dateObj.format('HHmm'),
            groupId: groupId || null
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">{initialData ? 'edit_calendar' : 'add_circle'}</span>
                        {initialData ? 'Edit Details' : 'New Runsheet'}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                        {initialData ? 'Update the title and date of your runsheet.' : 'Enter title and start time.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Runsheet Title</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Sunday Service"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                            className="rounded-xl h-11 text-base"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date & Time</Label>
                        <Input
                            id="date"
                            type="datetime-local"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            disabled={isLoading}
                            className="rounded-xl"
                        />
                    </div>
                    {!initialData && groups && groups.length > 0 && (
                        <div className="grid gap-2">
                            <Label htmlFor="group" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group</Label>
                            <select
                                id="group"
                                value={groupId}
                                onChange={(e) => setGroupId(e.target.value)}
                                disabled={isLoading}
                                className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">No Group</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || !date || isSubmitting || isLoading} className="rounded-xl shadow-sm">
                        {isLoading || isSubmitting ? 'Saving...' : initialData ? 'Save' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
