'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, query, orderBy, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import LoginBanner from '../../../components/LoginBanner';
import RunsheetEditor from '../../../components/Runsheet/RunsheetEditor';

export default function RunsheetPage() {
    const params = useParams();
    const { user, loading: authLoading } = useAuth();
    const [id, setId] = useState(null);
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [metaLoading, setMetaLoading] = useState(true);
    const [programmeLoading, setProgrammeLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const accessCheckedRef = useRef({ id: null, email: null });

    // Resolve the real ID from params or URL
    useEffect(() => {
        let currentId = params?.id;
        if (!currentId || currentId === 'fallback' || currentId === '%5Bid%5D' || currentId === '[id]') {
            const segments = window.location.pathname.split('/');
            const runsheetIndex = segments.indexOf('runsheet');
            if (runsheetIndex !== -1 && segments.length > runsheetIndex + 1) {
                currentId = segments[runsheetIndex + 1];
            }
        }
        setId(currentId);
    }, [params]);

    useEffect(() => {
        if (!id || id === 'fallback' || id === '[id]' || id === '%5Bid%5D') return;

        // ── Phase 1: Runsheet metadata ──
        let metaSnapshotFired = false;
        let notFoundTimer = null;
        
        const unsubRunsheet = onSnapshot(doc(db, 'runsheets', id), (docSnap) => {
            if (docSnap.exists()) {
                if (notFoundTimer) clearTimeout(notFoundTimer);
                setRunsheet({ id: docSnap.id, ...docSnap.data() });
                setNotFound(false);
            } else if (metaSnapshotFired) {
                // Only show not-found after first successful resolution (doc deleted)
                setNotFound(true);
            } else {
                // Give Firestore generous time to connect on cold starts / slow networks
                notFoundTimer = setTimeout(() => {
                    setNotFound(true);
                }, 5000);
            }
            if (!metaSnapshotFired) {
                metaSnapshotFired = true;
                setMetaLoading(false);
            }
        });

        // ── Phase 2: Programme items (independent) ──
        let programmeSnapshotFired = false;
        const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
        const unsubProgramme = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setProgramme(items);
            if (!programmeSnapshotFired) {
                programmeSnapshotFired = true;
                setProgrammeLoading(false);
            }
        });

        // Failsafe timeouts — must be longer than the notFoundTimer (5s)
        const metaTimer = setTimeout(() => {
            setMetaLoading(false);
        }, 8000);
        const progTimer = setTimeout(() => setProgrammeLoading(false), 10000);

        return () => {
            unsubRunsheet();
            unsubProgramme();
            if (notFoundTimer) clearTimeout(notFoundTimer);
            clearTimeout(metaTimer);
            clearTimeout(progTimer);
        };
    }, [id]);



    // Show spinner while loading OR while waiting for the first snapshot to arrive
    if (metaLoading || (!runsheet && !notFound)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="w-10 h-10 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading runsheet...</p>
            </div>
        );
    }

    if (notFound) {
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

    // Phase 2: Render editor immediately; programme items stream in
    return (
        <>
            {!authLoading && !user && <LoginBanner />}
            <RunsheetEditor
                runsheet={runsheet}
                initialProgramme={programme}
                programmeLoading={programmeLoading}
                isAuthenticated={!!user}
            />
        </>
    );
}
