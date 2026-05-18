'use client';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

const MinimalTiptapEditor = dynamic(
    () => import('@/components/ui/minimal-tiptap/minimal-tiptap').then(mod => mod.MinimalTiptapEditor),
    { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded-md w-full mt-4" /> }
);

export default function NotesTab({ runsheet, isEditor, mode }) {
    const [notes, setNotes] = useState(runsheet.notes || '');
    const [status, setStatus] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => { setNotes(runsheet.notes || ''); }, [runsheet.notes]);

    const handleSave = async (andClose = false) => {
        if (andClose) setIsEditing(false);
        setStatus('saving');
        try {
            await updateDoc(doc(db, 'runsheets', runsheet.id), { notes: notes });
            setStatus('saved');
            setTimeout(() => setStatus(''), 2000);
        } catch (error) {
            console.error("Error saving notes:", error);
            setStatus('error');
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm min-h-[50vh] flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-foreground tracking-tight">Notes</h3>
                    {status && (
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${status === 'error' ? 'bg-destructive/10 text-destructive' : status === 'saved' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            <span className="material-symbols-outlined text-xs">
                                {status === 'saving' ? 'sync' : status === 'saved' ? 'check_circle' : 'error'}
                            </span>
                            <span className="hidden sm:inline">
                                {status === 'saving' && 'Saving...'}
                                {status === 'saved' && 'Saved'}
                                {status === 'error' && 'Error'}
                            </span>
                        </div>
                    )}
                </div>
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setNotes(runsheet.notes || ''); }} className="h-8 rounded-lg px-3 hover:bg-muted font-medium border-border/60">Cancel</Button>
                        <Button size="sm" onClick={() => handleSave(true)} disabled={status === 'saving'} className="h-8 rounded-lg shadow-sm px-4 font-bold bg-primary text-primary-foreground hover:bg-primary/90">Save Notes</Button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className={`flex-grow flex flex-col relative ${isEditing ? 'p-4' : 'p-0'}`}>
                {isEditing ? (
                    <MinimalTiptapEditor
                        value={notes}
                        onChange={setNotes}
                        onBlur={() => handleSave(false)}
                        className="flex-grow min-h-[40vh] w-full border-border/40 shadow-inner bg-muted/10 rounded-xl"
                        editorContentClassName="p-5 text-base leading-relaxed min-h-[40vh] prose prose-base max-w-none dark:prose-invert prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5"
                        output="html"
                        placeholder="Enter notes for this service..."
                        editable={true}
                        editorClassName="focus:outline-hidden"
                    />
                ) : (
                    <div className="flex-grow flex flex-col justify-between min-h-[40vh] bg-background/50 p-6 md:p-8">
                        {notes ? (
                            <div
                                className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-1 prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal"
                                dangerouslySetInnerHTML={{ __html: notes }}
                            />
                        ) : (
                            <div className="text-center text-muted-foreground mt-4 py-12 border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                                <span className="material-symbols-outlined text-4xl mb-3 opacity-50">article</span>
                                <p>No notes have been added to this runsheet yet.</p>
                            </div>
                        )}
                        
                        {/* Edit FAB */}
                        {isEditor && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="absolute bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex items-center justify-center hover:scale-105 hover:bg-primary/95 active:scale-95 transition-all duration-200 z-10"
                                title="Edit Notes"
                            >
                                <span className="material-symbols-outlined text-[26px]">edit</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
