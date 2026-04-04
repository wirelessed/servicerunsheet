'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, query, where, collection, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import LoginBanner from '../../../components/LoginBanner';
import RunsheetList from '../../../components/Runsheet/RunsheetList';
import Link from 'next/link';
import moment from 'moment';

export default function GroupPageClient() {
    const params = useParams();
    const { user, loading: authLoading } = useAuth();

    // Resolve id/token from params or URL path
    const [id, setId] = useState(null);
    useEffect(() => {
        let t = params?.token;
        if (!t || t === 'fallback' || t === '[token]' || t === '%5Btoken%5D') {
            const segments = window.location.pathname.split('/');
            const groupIndex = segments.indexOf('group');
            if (groupIndex !== -1 && segments.length > groupIndex + 1) {
                t = segments[groupIndex + 1];
            }
        }
        setId(t);
    }, [params]);

    // ── LOGGED-IN: render the full dashboard filtered to this group ──
    if (!authLoading && user) {
        return <RunsheetList initialFilter={id || 'upcoming'} />;
    }

    // ── LOGGED-OUT: public group listing ──
    return <PublicGroupView id={id} authLoading={authLoading} />;
}

function PublicGroupView({ id, authLoading }) {
    const [group, setGroup] = useState(null);
    const [runsheets, setRunsheets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || id === 'fallback' || id === '[token]' || authLoading) return;

        const fetchData = async () => {
            try {
                // First try: id is a direct groupId
                let groupId = id;
                let groupSnap = await getDoc(doc(db, 'groups', id));

                // Second try: id is a shareToken — look up via groupTokens index
                if (!groupSnap.exists()) {
                    const tokenDoc = await getDoc(doc(db, 'groupTokens', id));
                    if (!tokenDoc.exists()) { setLoading(false); return; }
                    groupId = tokenDoc.data().groupId;
                    groupSnap = await getDoc(doc(db, 'groups', groupId));
                    if (!groupSnap.exists()) { setLoading(false); return; }
                }

                setGroup({ id: groupId, ...groupSnap.data() });

                const rsQuery = query(collection(db, 'runsheets'), where('groupId', '==', groupId));
                const rsSnap = await getDocs(rsQuery);
                const rsData = rsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                rsData.sort((a, b) => new Date(a.date) - new Date(b.date));
                setRunsheets(rsData);
            } catch (err) {
                console.error('Error loading public group page', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse font-medium">Loading Runsheet Group...</p>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-3xl font-extrabold tracking-tighter mb-2">Group Not Found</h1>
                <p className="text-muted-foreground">This group link may be invalid or has been removed.</p>
            </div>
        );
    }

    const grouped = {};
    runsheets.forEach(item => {
        const key = moment(item.date).format('MMMM YYYY');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        return moment(a, 'MMMM YYYY').toDate() - moment(b, 'MMMM YYYY').toDate();
    });

    return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <LoginBanner message="Log in to save this group's runsheets" />
            <div className="container mx-auto px-4 mt-12 mb-20 max-w-2xl">
                {/* Header */}
                <div className="mb-10 text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                        <span className="material-symbols-outlined text-3xl text-primary icon-filled">folder</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tighter">{group.name}</h1>
                    <p className="text-muted-foreground">{runsheets.length} runsheet{runsheets.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Runsheet List */}
                <div className="flex flex-col gap-0 pb-8">
                    {runsheets.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground">
                            <span className="material-symbols-outlined text-5xl block mb-3">event_busy</span>
                            <p className="font-semibold">No runsheets in this group yet.</p>
                        </div>
                    )}
                    
                    {sortedKeys.map(groupKey => (
                        <div key={groupKey} className="mb-2">
                            {/* Month header */}
                            <div className="px-2 md:px-0 py-3 mt-2">
                                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{groupKey}</h2>
                            </div>
                            <div className="flex flex-col gap-3">
                                {grouped[groupKey].map(rs => {
                                    const dateObj = moment(rs.date);
                                    const isToday = dateObj.isSame(moment(), 'day');
                                    const isPast = dateObj.isBefore(moment(), 'day');
                                    return (
                                        <Link
                                            key={rs.id}
                                            href={`/runsheet/${rs.id}`}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group"
                                        >
                                            <div className={`
                                                flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0
                                                ${isToday ? 'bg-primary text-primary-foreground' : isPast ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}
                                            `}>
                                                <span className="text-[9px] font-bold uppercase">{dateObj.format('ddd')}</span>
                                                <span className="text-lg font-extrabold leading-none">{dateObj.format('D')}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{rs.name}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Updated {rs.lastUpdated ? moment(rs.lastUpdated).fromNow() : 'recently'}
                                                </p>
                                            </div>
                                            <span className="material-symbols-outlined text-muted-foreground group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
