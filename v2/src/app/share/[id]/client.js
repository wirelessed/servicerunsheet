'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
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
    const { user } = useAuth();
    const [id, setId] = useState(null);
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timings, setTimings] = useState({});
    const [enrolled, setEnrolled] = useState(false);
    const [token, setToken] = useState(null);
    const [tokenInvalid, setTokenInvalid] = useState(false);

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
            const segments = window.location.pathname.split('/');
            const shareIndex = segments.indexOf('share');
            if (shareIndex !== -1 && segments.length > shareIndex + 1) {
                currentId = segments[shareIndex + 1];
            }
        }
        setId(currentId);

        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            setToken(searchParams.get('token'));
        }
    }, [params]);

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
                            const userRoleRef = doc(db, `runsheets/${id}/users`, user.email);
                            const userRsRef = doc(db, `users/${user.email}/runsheets`, id);

                            const [existing, userRsSnap] = await Promise.all([
                                getDoc(userRoleRef),
                                getDoc(userRsRef)
                            ]);

                            const docData = docSnap.data();
                            const mainRole = docData.roles?.[user.email];
                            const inMemberEmails = docData.memberEmails?.includes(user.email);

                            if (existing.exists() || mainRole) {
                                // User already has a role — don't overwrite, but heal if out of sync
                                const subRole = existing.exists() ? existing.data().role : null;
                                const needsPersonalRef = !userRsSnap.exists();
                                const needsSubcollectionRef = mainRole && !existing.exists();
                                const needsMainDocUpdate = subRole && (!mainRole || !inMemberEmails);

                                if (needsPersonalRef || needsSubcollectionRef || needsMainDocUpdate) {
                                    const batch = writeBatch(db);
                                    if (needsPersonalRef) {
                                        batch.set(userRsRef, { id });
                                    }
                                    if (needsSubcollectionRef) {
                                        batch.set(userRoleRef, { role: mainRole, email: user.email, id: user.email });
                                    }
                                    if (needsMainDocUpdate) {
                                        const currentEmails = docData.memberEmails || [];
                                        const updates = {};
                                        if (!currentEmails.includes(user.email)) {
                                            updates.memberEmails = [...currentEmails, user.email];
                                        }
                                        updates[`roles.${user.email}`] = subRole;
                                        batch.update(docRef, updates);
                                    }
                                    await batch.commit();
                                }
                                setEnrolled(true);
                            } else {
                                // Truly new viewer — no role anywhere
                                const batch = writeBatch(db);
                                batch.set(userRoleRef, { role: 'viewer', email: user.email, id: user.email });
                                batch.set(userRsRef, { id });

                                const currentEmails = docData.memberEmails || [];
                                const currentRoles = docData.roles || {};
                                if (!currentEmails.includes(user.email)) {
                                    batch.update(docRef, {
                                        memberEmails: [...new Set([...currentEmails, user.email])],
                                        roles: {
                                            ...currentRoles,
                                            [user.email]: 'viewer'
                                        }
                                    });
                                }
                                await batch.commit();
                                setEnrolled(true);
                            }
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
                <h1 className="text-3xl font-extrabold tracking-tighter text-foreground">Old or Invalid Share Link</h1>
                <p className="text-muted-foreground max-w-sm">
                    This share link is missing a valid security token or has expired. Please request a new share link from the runsheet owner.
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
            
            {enrolled && (
                <div className="container mx-auto px-4 mt-4 max-w-7xl">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Saved to your runsheet list!
                    </div>
                </div>
            )}

            <div className="flex-1">
                <RunsheetEditor
                    runsheet={runsheet}
                    items={programme}
                    timings={timings}
                    mode="view"
                />
            </div>
        </div>
    );
}
