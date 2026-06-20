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
        if (!currentId || currentId === 'fallback' || currentId === '%5Bid%5D') {
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

    // ── Phase 3: Automatic Access ──
    useEffect(() => {
        if (!id || id === 'fallback' || !user?.email || !runsheet) return;
        if (accessCheckedRef.current.id === id && accessCheckedRef.current.email === user.email) return;
        accessCheckedRef.current = { id, email: user.email };

        const grantViewerAccess = async () => {
            try {
                const userRsRef = doc(db, `users/${user.email}/runsheets`, id);
                const rsUserRef = doc(db, `runsheets/${id}/users`, user.email);

                const [userSnap, rsUserSnap] = await Promise.all([
                    getDoc(userRsRef),
                    getDoc(rsUserRef)
                ]);

                // If user already has a role in the subcollection, ensure all references match
                if (rsUserSnap.exists()) {
                    const subRole = rsUserSnap.data().role || 'viewer';
                    const mainRole = runsheet.roles?.[user.email];
                    const inMemberEmails = runsheet.memberEmails?.includes(user.email);

                    const needsPersonalRef = !userSnap.exists();
                    const needsMainDocUpdate = !mainRole || !inMemberEmails;

                    if (needsPersonalRef || needsMainDocUpdate) {
                        const batch = writeBatch(db);
                        if (needsPersonalRef) {
                            batch.set(userRsRef, { id });
                        }
                        if (needsMainDocUpdate) {
                            const currentEmails = runsheet.memberEmails || [];
                            const currentRoles = runsheet.roles || {};
                            const updates = {};
                            if (!currentEmails.includes(user.email)) {
                                updates.memberEmails = [...currentEmails, user.email];
                            }
                            if (currentRoles[user.email] !== subRole) {
                                updates.roles = { ...currentRoles, [user.email]: subRole };
                            }
                            batch.update(doc(db, 'runsheets', id), updates);
                        }
                        await batch.commit();
                    }
                    return;
                }

                // If user has a role in the main doc roles map but not in subcollection, heal it
                const mainDocRole = runsheet.roles?.[user.email];
                if (mainDocRole) {
                    const needsPersonalRef = !userSnap.exists();
                    const needsSubcollectionRef = !rsUserSnap.exists();

                    if (needsPersonalRef || needsSubcollectionRef) {
                        const batch = writeBatch(db);
                        if (needsPersonalRef) {
                            batch.set(userRsRef, { id });
                        }
                        if (needsSubcollectionRef) {
                            batch.set(rsUserRef, {
                                id: user.email,
                                email: user.email,
                                role: mainDocRole
                            });
                        }
                        await batch.commit();
                    }
                    return;
                }

                // Truly new viewer — no role anywhere
                const batch = writeBatch(db);
                batch.set(userRsRef, { id });
                batch.set(rsUserRef, {
                    id: user.email,
                    email: user.email,
                    role: 'viewer',
                    addedAt: new Date().toISOString()
                });

                // Update memberEmails and roles on the main runsheet document
                const currentEmails = runsheet.memberEmails || [];
                const currentRoles = runsheet.roles || {};
                if (!currentEmails.includes(user.email)) {
                    batch.update(doc(db, 'runsheets', id), {
                        memberEmails: [...currentEmails, user.email],
                        roles: { ...currentRoles, [user.email]: 'viewer' }
                    });
                }

                await batch.commit();
            } catch (err) {
                console.error("Error granting viewer access:", err);
            }
        };

        grantViewerAccess();
    }, [id, user, runsheet]);

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
