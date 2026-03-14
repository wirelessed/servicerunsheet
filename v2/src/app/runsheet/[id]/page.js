'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

import RunsheetEditor from '../../../components/Runsheet/RunsheetEditor';

export default function RunsheetPage() {
    const params = useParams();
    const id = params.id;
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const unsubRunsheet = onSnapshot(doc(db, 'runsheets', id), (doc) => {
            if (doc.exists()) {
                setRunsheet({ id: doc.id, ...doc.data() });
            }
        });

        const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
        const unsubProgramme = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setProgramme(items);
            setLoading(false);
        });

        return () => { unsubRunsheet(); unsubProgramme(); };
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading runsheet...</p>
            </div>
        );
    }

    if (!runsheet) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground">error</span>
                </div>
                <p className="text-base font-semibold text-foreground">Runsheet not found</p>
                <p className="text-sm text-muted-foreground">The runsheet you&apos;re looking for doesn&apos;t exist.</p>
            </div>
        );
    }

    return <RunsheetEditor runsheet={runsheet} initialProgramme={programme} />;
}
