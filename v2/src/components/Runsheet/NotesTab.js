'use client';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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
        <div className="card bg-base-100 shadow-xl h-full min-h-[50vh]">
            <div className="card-body">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="card-title">Runsheet Notes</h2>
                    <span className="text-xs text-base-content/50 uppercase font-bold">
                        {status === 'saving' && 'Saving...'}
                        {status === 'saved' && 'Saved'}
                        {status === 'error' && 'Error Saving'}
                    </span>
                </div>
                <textarea
                    className="textarea textarea-bordered w-full h-full min-h-[40vh] text-lg leading-relaxed resize-none p-4"
                    placeholder="Enter notes for this service..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleSave}
                ></textarea>
                <div className="card-actions justify-end mt-2">
                    <button className="btn btn-primary" onClick={handleSave} disabled={status === 'saving'}>
                        Save Notes
                    </button>
                </div>
            </div>
        </div>
    );
}
