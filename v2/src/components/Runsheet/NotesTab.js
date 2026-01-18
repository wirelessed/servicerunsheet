'use client';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinimalTiptapEditor } from '../ui/minimal-tiptap';

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
                <MinimalTiptapEditor
                    value={notes}
                    onChange={setNotes}
                    onBlur={() => handleSave()}
                    className="flex-grow min-h-[40vh] w-full border-muted/40 shadow-inner bg-muted/20"
                    editorContentClassName="p-6 text-lg leading-relaxed min-h-[40vh]"
                    output="html"
                    placeholder="Enter notes for this service..."
                    editable={true}
                    editorClassName="focus:outline-hidden"
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
