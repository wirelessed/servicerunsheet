'use client';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LoginBanner from '../../../components/LoginBanner';
import moment from 'moment';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import RunsheetEditor from '../../../components/Runsheet/RunsheetEditor';

export default function SharePage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [id, setId] = useState(null);
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timings, setTimings] = useState({});
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

        const fetchData = async () => {
            try {
                // Fetch Runsheet
                const docRef = doc(db, 'runsheets', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // Validate token
                    const runsheetToken = data.shareToken;
                    if (!token || !runsheetToken || token !== runsheetToken) {
                        setTokenInvalid(true);
                        setLoading(false);
                        return;
                    }

                    setRunsheet({ id: docSnap.id, ...data });

                    // Fetch Programme
                    const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
                    const querySnapshot = await getDocs(q);
                    const items = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Calculate timings
                    const startTimeStr = docSnap.data().time;
                    let currentTime = moment(startTimeStr, "HHmm");
                    const newTimings = {};

                    items.forEach(item => {
                        newTimings[item.id] = currentTime.format("h:mm a");
                        const duration = parseInt(item.duration) || 0;
                        currentTime.add(duration, 'minutes');
                    });
                    setTimings(newTimings);
                    setProgramme(items);

                    // Auto-enroll logged-in user as viewer
                    if (user?.email) {
                        try {
                            const existingRole = data.roles?.[user.email] || data.roles?.[user.email.toLowerCase()];
                            const inMemberEmails = data.memberEmails?.includes(user.email);

                            // Only write if something is missing
                            if (!existingRole || !inMemberEmails) {
                                const batch = writeBatch(db);

                                // Ensure user is in memberEmails and roles on main doc
                                const currentEmails = data.memberEmails || [];
                                const updates = {};
                                if (!inMemberEmails) {
                                    updates.memberEmails = [...currentEmails, user.email];
                                }
                                if (!existingRole) {
                                    updates[`roles.${user.email}`] = 'viewer';
                                }
                                if (Object.keys(updates).length > 0) {
                                    batch.update(docRef, updates);
                                }

                                // Ensure subcollection user doc and personal ref exist
                                batch.set(doc(db, `runsheets/${id}/users`, user.email), {
                                    id: user.email, email: user.email, role: existingRole || 'viewer'
                                }, { merge: true });
                                batch.set(doc(db, `users/${user.email}/runsheets`, id), { id }, { merge: true });

                                await batch.commit();
                            }
                            setEnrolled(true);
                        } catch (e) {
                            console.error('Error auto-enrolling user', e);
                        }
                    }

                    setLoading(false);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error fetching shared runsheet", err);
                setLoading(false);
            }
        };
        fetchData();

        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [id, user]);

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
