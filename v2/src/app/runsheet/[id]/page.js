'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Navbar from '../../../components/Navbar';
import RunsheetEditor from '../../../components/Runsheet/RunsheetEditor';

export default function RunsheetPage() {
    const params = useParams();
    const id = params.id;
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        // 1. Subscribe to Runsheet Metadata
        const unsubRunsheet = onSnapshot(doc(db, 'runsheets', id), (doc) => {
            if (doc.exists()) {
                setRunsheet({ id: doc.id, ...doc.data() });
            }
        });

        // 2. Subscribe to Programme Subcollection
        const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
        const unsubProgramme = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setProgramme(items);
            setLoading(false);
        });

        return () => {
            unsubRunsheet();
            unsubProgramme();
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center mt-10">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (!runsheet) {
        return <p className="text-center mt-10">Runsheet not found</p>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-base-200">
            <Navbar />
            <div className="container mx-auto px-4 mt-8 flex-1 max-w-4xl">
                <RunsheetEditor runsheet={runsheet} initialProgramme={programme} />
            </div>
        </div>
    );
}
