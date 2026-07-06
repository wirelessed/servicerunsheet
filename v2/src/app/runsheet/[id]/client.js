'use client';
import { useParams, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, query, orderBy, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import LoginBanner from '../../../components/LoginBanner';
import RunsheetEditor from '../../../components/Runsheet/RunsheetEditor';

export default function RunsheetPage() {
    const params = useParams();
    const pathname = usePathname();
    const { user, loading: authLoading } = useAuth();
    const [id, setId] = useState(null);
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [metaLoading, setMetaLoading] = useState(true);
    const [programmeLoading, setProgrammeLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const accessCheckedRef = useRef({ id: null, email: null });

    const [accessDenied, setAccessDenied] = useState(false);

    // Resolve the real ID from params or URL
    useEffect(() => {
        let currentId = params?.id;
        if (!currentId || currentId === 'fallback' || currentId === '%5Bid%5D' || currentId === '[id]') {
            const segments = pathname.split('/');
            const runsheetIndex = segments.indexOf('runsheet');
            if (runsheetIndex !== -1 && segments.length > runsheetIndex + 1) {
                currentId = segments[runsheetIndex + 1];
            }
        }
        setId(currentId);
    }, [params, pathname]);

    // Client-side access gating
    useEffect(() => {
        if (authLoading || !runsheet) return;

        let hasAccess = false;

        // 1. Logged in member
        if (user?.email && runsheet.memberEmails?.includes(user.email)) {
            hasAccess = true;
        }

        // 2. Query param ?token=
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            if (urlToken && runsheet.shareToken && urlToken === runsheet.shareToken) {
                hasAccess = true;
                sessionStorage.setItem(`runsheetToken_${runsheet.id}`, urlToken);
            }

            // 3. sessionStorage runsheet token
            const cachedToken = sessionStorage.getItem(`runsheetToken_${runsheet.id}`);
            if (cachedToken && runsheet.shareToken && cachedToken === runsheet.shareToken) {
                hasAccess = true;
            }

            // 4. sessionStorage group token
            if (runsheet.groupId) {
                const cachedGroupToken = sessionStorage.getItem(`groupToken_${runsheet.groupId}`);
                if (cachedGroupToken) {
                    hasAccess = true;
                }
            }
        }

        if (!hasAccess) {
            setAccessDenied(true);
        } else {
            setAccessDenied(false);
        }
    }, [runsheet, user, authLoading]);

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
        }, (error) => {
            console.error("Runsheet metadata listener error:", error);
            setNotFound(true);
            setMetaLoading(false);
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
        }, (error) => {
            console.error("Programme listener error:", error);
            setProgrammeLoading(false);
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

    if (accessDenied) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 gap-6">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <div className="text-center space-y-2 max-w-sm">
                    <h2 className="text-xl font-bold text-foreground">Expired Share Link</h2>
                    <p className="text-sm text-muted-foreground">
                        This link has expired. Please request for a new link from the runsheet owner.
                    </p>
                </div>
                <button
                    onClick={() => { window.location.href = '/upcoming'; }}
                    className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-6 gap-2 cursor-pointer"
                >
                    Back to Dashboard
                </button>
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
