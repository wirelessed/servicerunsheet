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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function RunsheetMetadataDialog({ open, onClose, onSubmit, initialData, isLoading, groups = [], activeFilter = null }) {
    const [name, setName] = useState('');
    const [selectedDate, setSelectedDate] = useState(undefined);
    const [time, setTime] = useState('');
    const [groupId, setGroupId] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setName(initialData ? initialData.name : '');
            
            const parsedDate = initialData?.date 
                ? moment(initialData.date.split('T')[0], 'YYYY-MM-DD').toDate()
                : new Date();
            setSelectedDate(parsedDate);

            const parsedTime = initialData?.time 
                ? moment(initialData.time, 'HHmm').format('HH:mm')
                : initialData?.date
                    ? moment(initialData.date).format('HH:mm')
                    : moment().startOf('hour').format('HH:mm');
            setTime(parsedTime);
            setNewGroupName('');
            
            if (!initialData && activeFilter && !['upcoming', 'past', 'archive'].includes(activeFilter)) {
                setGroupId(activeFilter);
            } else {
                setGroupId('');
            }
            
            setIsSubmitting(false);
        }
    }, [open, initialData, activeFilter]);

    const handleSubmit = () => {
        if (!name.trim() || !selectedDate || !time || isSubmitting) return;
        if (groupId === 'CREATE_NEW_GROUP' && !newGroupName.trim()) return;

        setIsSubmitting(true);
        const dateStr = moment(selectedDate).format('YYYY-MM-DD');
        const timeStr = moment(time, 'HH:mm').format('HHmm');
        onSubmit({ 
            name, 
            date: dateStr, 
            time: timeStr,
            groupId: groupId === 'CREATE_NEW_GROUP' ? 'CREATE_NEW_GROUP' : (groupId || null),
            newGroupName: groupId === 'CREATE_NEW_GROUP' ? newGroupName.trim() : null
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal rounded-xl h-11 px-3 border border-input shadow-xs",
                                            "bg-transparent hover:bg-transparent",
                                            "dark:bg-input/80 dark:hover:bg-input/80",
                                            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                                            selectedDate ? "text-foreground hover:text-foreground" : "text-muted-foreground hover:text-muted-foreground"
                                        )}
                                        disabled={isLoading}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                        {selectedDate ? (
                                            moment(selectedDate).format("D MMM YYYY")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Time</Label>
                            <Input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                disabled={isLoading}
                                className="rounded-xl h-11"
                            />
                        </div>
                    </div>
                    {!initialData && groups && (
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
                                <option value="CREATE_NEW_GROUP">+ Create a new group...</option>
                            </select>
                            {groupId === 'CREATE_NEW_GROUP' && (
                                <div className="grid gap-2 mt-2">
                                    <Label htmlFor="newGroupName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Group Name</Label>
                                    <Input
                                        id="newGroupName"
                                        placeholder="e.g. Youth Ministry"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        disabled={isLoading}
                                        className="rounded-xl h-11 text-base"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || !selectedDate || !time || isSubmitting || isLoading || (groupId === 'CREATE_NEW_GROUP' && !newGroupName.trim())} className="rounded-xl shadow-sm">
                        {isLoading || isSubmitting ? 'Saving...' : initialData ? 'Save' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
