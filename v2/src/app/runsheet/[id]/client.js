'use client';
import { useParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db, getSharedRunsheet } from '../../../lib/firebase';
import { subscribeSharedRunsheet } from '../../../lib/sharedRunsheet';
import { useAuth } from '../../../context/AuthContext';
import { useDashboard } from '../../../context/DashboardContext';
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

    const [accessDenied, setAccessDenied] = useState(false);
    const [memberReady, setMemberReady] = useState(false);
    const [dashWaited, setDashWaited] = useState(false);
    const { runsheets, runsheetsLoaded } = useDashboard();

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

    useEffect(() => {
        if (!id || id === 'fallback' || id === '[id]' || id === '%5Bid%5D') return;
        if (authLoading) return;

        // Share token from the URL (runsheet or group token), else one cached this session.
        let token = null;
        if (typeof window !== 'undefined') {
            token = new URLSearchParams(window.location.search).get('token')
                || sessionStorage.getItem(`runsheetToken_${id}`);
        }

        let active = true;
        let unsubs = [];

        const finishDenied = () => {
            if (!active) return;
            setAccessDenied(true);
            setMetaLoading(false);
            setProgrammeLoading(false);
        };

        // Token holders: data comes only from the server after it validates the token.
        const loadViaToken = async () => {
            try {
                const res = await getSharedRunsheet(id, token);
                if (!active) return null;
                sessionStorage.setItem(`runsheetToken_${id}`, token);
                setAccessDenied(false);
                return res;
            } catch (err) {
                if (err?.code !== 'functions/permission-denied') console.error('Shared runsheet error:', err);
                return null;
            }
        };

        // Members: live programme listener. Firestore rules reject non-members.
        // (The runsheet doc itself comes from the dashboard listener when it has it — see below.)
        const subscribeLive = () => {
            setMemberReady(true);
            const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
            unsubs.push(onSnapshot(q, (snapshot) => {
                setProgramme(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                setProgrammeLoading(false);
            }, (error) => {
                if (error?.code !== 'permission-denied') console.error("Programme listener error:", error);
                setProgrammeLoading(false);
            }));
        };

        const run = async () => {
            if (token && !user) {
                // Logged-out link holder: live, email-free view via anonymous viewer pass.
                unsubs.push(subscribeSharedRunsheet(id, token, {
                    onMeta: (meta) => {
                        sessionStorage.setItem(`runsheetToken_${id}`, token);
                        setAccessDenied(false);
                        setRunsheet(meta);
                        setMetaLoading(false);
                    },
                    onProgramme: (items) => { setProgramme(items); setProgrammeLoading(false); },
                    onDenied: finishDenied,
                }));
                return;
            }
            if (token) {
                // Signed in: the call enrolls us (if the token is valid), then go live as a member.
                await loadViaToken();
                if (!active) return;
            }
            if (user) subscribeLive();
            else finishDenied();
        };
        run();

        return () => {
            active = false;
            setMemberReady(false);
            unsubs.forEach(u => u());
        };
    }, [id, user, authLoading]);

    // Give the dashboard listener a moment to deliver before falling back to our own doc listener.
    useEffect(() => {
        if (runsheetsLoaded) return;
        const t = setTimeout(() => setDashWaited(true), 1500);
        return () => clearTimeout(t);
    }, [runsheetsLoaded]);

    // The dashboard already listens to the member's upcoming runsheets; reuse that copy
    // instead of paying for a second listener on the same doc.
    const dashEntry = (user && runsheetsLoaded && id)
        ? (runsheets.find(r => r.id === id && !r._stale) || null)
        : null;
    const inDashboard = !!dashEntry;
    const dashReady = runsheetsLoaded || dashWaited;

    useEffect(() => {
        if (!id || !user || !memberReady || !dashReady || inDashboard) return;

        let fired = false;
        const unsub = onSnapshot(doc(db, 'runsheets', id), (docSnap) => {
            if (docSnap.exists()) {
                setRunsheet({ id: docSnap.id, ...docSnap.data() });
                setNotFound(false);
            } else {
                setNotFound(true);
            }
            if (!fired) { fired = true; setMetaLoading(false); }
        }, (error) => {
            if (error?.code === 'permission-denied') {
                setAccessDenied(true);
                setProgrammeLoading(false);
            } else {
                console.error("Runsheet metadata listener error:", error);
                setNotFound(true);
            }
            setMetaLoading(false);
        });
        return () => unsub();
    }, [id, user, memberReady, dashReady, inDashboard]);

    const shownRunsheet = inDashboard ? dashEntry : runsheet;
    const denied = accessDenied && !inDashboard;
    const missing = notFound && !inDashboard;
    const stillLoading = !inDashboard && (metaLoading || (!runsheet && !notFound));

    // Show spinner while loading OR while waiting for the first snapshot to arrive
    if (!denied && stillLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="w-10 h-10 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading runsheet...</p>
            </div>
        );
    }

    if (missing) {
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

    if (denied) {
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
                runsheet={shownRunsheet}
                initialProgramme={programme}
                programmeLoading={programmeLoading}
                isAuthenticated={!!user}
            />
        </>
    );
}
