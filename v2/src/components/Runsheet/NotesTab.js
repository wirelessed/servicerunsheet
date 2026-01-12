'use client';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotesTab({ runsheet }) {
    const [notes, setNotes] = useState(runsheet.notes || '');
    const [status, setStatus] = useState(''); // 'saving', 'saved', 'error'

    useEffect(() => {
        setNotes(runsheet.notes || '');
    }, [runsheet.notes]);

    const handleSave = async () => {
        setStatus('saving');
        try {
            const runsheetRef = doc(db, 'runsheets', runsheet.id);
            await updateDoc(runsheetRef, { notes: notes });
            setStatus('saved');
            setTimeout(() => setStatus(''), 2000);
        } catch (error) {
            console.error("Error saving notes:", error);
            setStatus('error');
        }
    };

    return (
        <Card className="shadow-lg border-muted/60 min-h-[50vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">Runsheet Notes</CardTitle>
                    <CardDescription>Event-specific reminders and operational notes.</CardDescription>
                </div>
                {status && (
                    <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-muted/50 ${status === 'error' ? 'text-destructive' : 'text-primary'}`}>
                        {status === 'saving' && 'Saving...'}
                        {status === 'saved' && 'Saved'}
                        {status === 'error' && 'Error'}
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col pt-0">
                <Textarea
                    className="flex-grow min-h-[40vh] text-lg leading-relaxed shadow-inner bg-muted/20 border-muted/40 focus-visible:ring-primary/20 p-6 resize-none"
                    placeholder="Enter notes for this service..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleSave}
                />
                <div className="flex justify-end mt-4">
                    <Button onClick={handleSave} disabled={status === 'saving'} className="min-w-[120px]">
                        Save Notes
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
