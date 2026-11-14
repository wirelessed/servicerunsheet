'use client';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSharedRunsheet } from '../../../lib/firebase';
import { subscribeSharedRunsheet } from '../../../lib/sharedRunsheet';
import { useAuth } from '../../../context/AuthContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LoginBanner from '../../../components/LoginBanner';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import RunsheetEditor from '../../../components/Runsheet/RunsheetEditor';

export default function SharePage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const [id, setId] = useState(null);
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolled, setEnrolled] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [token, setToken] = useState(null);
    const [tokenInvalid, setTokenInvalid] = useState(false);

    useEffect(() => {
        if (enrolled) {
            setShowToast(true);
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [enrolled]);

    const handleBackToDashboard = () => {
        if (runsheet?.groupId) {
            router.replace(`/group/${runsheet.groupId}`);
        } else {
            router.replace('/upcoming');
        }
    };

    useEffect(() => {
        let currentId = params?.id;
        if (!currentId || currentId === 'fallback' || currentId === '%5Bid%5D' || currentId === '[id]') {
            const segments = pathname.split('/');
            const shareIndex = segments.indexOf('share');
            if (shareIndex !== -1 && segments.length > shareIndex + 1) {
                currentId = segments[shareIndex + 1];
            }
        }
        setId(currentId);

        if (searchParams) {
            setToken(searchParams.get('token'));
        }
    }, [params, pathname, searchParams]);

    useEffect(() => {
        if (!id || id === 'fallback' || id === '[id]' || id === '%5Bid%5D') return;
        if (authLoading) return;
        if (!token) {
            setTokenInvalid(true);
            setLoading(false);
            return;
        }

        if (!user) {
            const unsub = subscribeSharedRunsheet(id, token, {
                onMeta: (meta) => {
                    sessionStorage.setItem(`runsheetToken_${id}`, token);
                    setRunsheet({ ...meta, roles: {} });
                    setLoading(false);
                },
                onProgramme: setProgramme,
                onDenied: () => { setTokenInvalid(true); setLoading(false); },
            });
            return unsub;
        }

        let active = true;
        const fetchData = async () => {
            try {
                // Token is validated server-side; nothing is returned unless it matches.
                // Signed-in callers are enrolled as viewers by the same call.
                const res = await getSharedRunsheet(id, token);
                if (!active) return;

                const roles = user?.email && res.role ? { [user.email]: res.role } : {};
                setRunsheet({ ...res.runsheet, roles });
                setProgramme(res.programme);
                sessionStorage.setItem(`runsheetToken_${id}`, token);
                if (res.enrolled) setEnrolled(true);
            } catch (err) {
                if (!active) return;
                if (err?.code === 'functions/permission-denied') {
                    setTokenInvalid(true);
                } else {
                    console.error("Error fetching shared runsheet", err);
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        fetchData();

        return () => { active = false; };
    }, [id, token, user, authLoading]);

    if (tokenInvalid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background gap-4">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl">warning</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tighter text-foreground">Expired Share Link</h1>
                <p className="text-muted-foreground max-w-sm">
                    This link has expired. Please request for a new link from the runsheet owner.
                </p>
                <Button onClick={() => router.push('/')} variant="outline" className="rounded-xl mt-2">
                    Go Home
                </Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse font-medium">Loading Runsheet...</p>
            </div>
        );
    }

    if (!runsheet) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-3xl font-extrabold tracking-tighter mb-2">Not Found</h1>
                <p className="text-muted-foreground">This runsheet may have been deleted or is private.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            {!user && <LoginBanner message="Log in to save this runsheet" />}

            {showToast && (
                <div 
                    onClick={() => setShowToast(false)}
                    className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 animate-in fade-in slide-in-from-top-4 duration-300 cursor-pointer"
                >
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-semibold shadow-xl backdrop-blur bg-background/95">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>Saved to your runsheet list!</span>
                    </div>
                </div>
            )}

            <div className="flex-1">
                <RunsheetEditor
                    runsheet={runsheet}
                    initialProgramme={programme}
                    programmeLoading={false}
                    isAuthenticated={!!user}
                />
            </div>
        </div>
    );
}
