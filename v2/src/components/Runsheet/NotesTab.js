'use client';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from "@/components/ui/button";
import { MinimalTiptapEditor } from '../ui/minimal-tiptap';

export default function NotesTab({ runsheet, isEditor, mode }) {
    const [notes, setNotes] = useState(runsheet.notes || '');
    const [status, setStatus] = useState('');

    useEffect(() => { setNotes(runsheet.notes || ''); }, [runsheet.notes]);

    const handleSave = async () => {
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
        <div className="rounded-xl border border-border bg-card shadow-sm min-h-[50vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight">Notes</h3>
                </div>
                {status && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${status === 'error' ? 'bg-destructive/10 text-destructive' : status === 'saved' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                        <span className="material-symbols-outlined text-xs">
                            {status === 'saving' ? 'sync' : status === 'saved' ? 'check_circle' : 'error'}
                        </span>
                        {status === 'saving' && 'Saving...'}
                        {status === 'saved' && 'Saved'}
                        {status === 'error' && 'Error'}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className={`flex-grow flex flex-col ${mode === 'edit' && isEditor ? 'p-4' : 'p-0'}`}>
                {isEditor && mode === 'edit' ? (
                    <>
                        <MinimalTiptapEditor
                            value={notes}
                            onChange={setNotes}
                            onBlur={() => handleSave()}
                            className="flex-grow min-h-[40vh] w-full border-border/40 shadow-inner bg-muted/20 rounded-xl"
                            editorContentClassName="p-5 text-base leading-relaxed min-h-[40vh] prose prose-base max-w-none dark:prose-invert prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5"
                            output="html"
                            placeholder="Enter notes for this service..."
                            editable={true}
                            editorClassName="focus:outline-hidden"
                        />
                        <div className="flex justify-end mt-4">
                            <Button onClick={handleSave} disabled={status === 'saving'} className="min-w-[120px] rounded-xl shadow-sm">
                                <span className="material-symbols-outlined text-sm mr-1.5">save</span>
                                Save Notes
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow min-h-[40vh] bg-background/50 p-6 md:p-8">
                        {notes ? (
                            <div
                                className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-1 prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal"
                                dangerouslySetInnerHTML={{ __html: notes }}
                            />
                        ) : (
                            <div className="text-center text-muted-foreground mt-12 py-12 border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                                <span className="material-symbols-outlined text-4xl mb-3 opacity-50">article</span>
                                <p>No notes have been added to this runsheet yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
