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
import dynamic from 'next/dynamic';

const ShareGroupDialog = dynamic(() => import('../../../components/Runsheet/ShareGroupDialog'), { ssr: false });

export default function GroupPageClient() {
    const params = useParams();
    const { user, loading: authLoading } = useAuth();

    // 1. Compute the raw token from URL or params synchronously
    let rawToken = params?.token;
    if (!rawToken || rawToken === 'fallback' || rawToken === '[token]' || rawToken === '%5Btoken%5D') {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const queryToken = searchParams.get('token');
            if (queryToken) {
                rawToken = queryToken;
            } else {
                const segments = window.location.pathname.split('/');
                const groupIndex = segments.indexOf('group');
                if (groupIndex !== -1 && segments.length > groupIndex + 1) {
                    const t = segments[groupIndex + 1];
                    if (t && t !== 'fallback' && t !== '[token]') {
                        rawToken = decodeURIComponent(t);
                    }
                }
            }
        }
    }

    // Clean up fallback URL in browser address bar
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            const queryToken = searchParams.get('token');
            if (path.endsWith('/fallback') && queryToken) {
                window.history.replaceState(null, '', `/group/${queryToken}`);
            }
        }
    }, []);

    // 2. State for resolving share tokens
    const [resolvedGroupId, setResolvedGroupId] = useState(null);

    useEffect(() => {
        if (!rawToken || rawToken === 'fallback' || rawToken === '[token]') return;

        // Reset resolved group when token changes
        setResolvedGroupId(null);

        const resolveToken = async () => {
            try {
                const tokenDoc = await getDoc(doc(db, 'groupTokens', rawToken));
                if (tokenDoc.exists()) {
                    setResolvedGroupId(tokenDoc.data().groupId);
                }
            } catch (err) {
                console.error("Failed to resolve token", err);
            }
        };

        resolveToken();
    }, [rawToken]);

    const activeId = resolvedGroupId || rawToken;

    // ── AUTH LOADING ──
    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="w-12 h-12 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
            </div>
        );
    }

    // ── LOGGED-IN: render the full dashboard filtered to this group ──
    if (user) {
        return <RunsheetList initialFilter={activeId} />;
    }

    // ── LOGGED-OUT: public group listing ──
    return <PublicGroupView id={activeId} />;
}

function PublicGroupView({ id }) {
    const [group, setGroup] = useState(null);
    const [runsheets, setRunsheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shareGroupDialog, setShareGroupDialog] = useState(false);

    useEffect(() => {
        if (!id || id === 'fallback' || id === '[token]') return;

        const cacheKeyGroup = `public_group_${id}`;
        const cacheKeyRunsheets = `public_group_runsheets_${id}`;
        
        let hasCache = false;
        try {
            const cachedGroup = localStorage.getItem(cacheKeyGroup);
            const cachedRunsheets = localStorage.getItem(cacheKeyRunsheets);
            if (cachedGroup && cachedRunsheets) {
                setGroup(JSON.parse(cachedGroup));
                setRunsheets(JSON.parse(cachedRunsheets));
                setLoading(false);
                hasCache = true;
            }
        } catch (e) {
            console.error('Failed to parse public group cache', e);
        }

        if (!hasCache) {
            setLoading(true);
        }

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

                const groupData = { id: groupId, ...groupSnap.data() };
                setGroup(groupData);
                localStorage.setItem(cacheKeyGroup, JSON.stringify(groupData));

                const rsQuery = query(collection(db, 'runsheets'), where('groupId', '==', groupId));
                const rsSnap = await getDocs(rsQuery);
                const rsData = rsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                rsData.sort((a, b) => {
                    const diff = new Date(a.date) - new Date(b.date);
                    if (diff === 0) {
                        const timeA = a.time || "";
                        const timeB = b.time || "";
                        return timeA.localeCompare(timeB);
                    }
                    return diff;
                });
                setRunsheets(rsData);
                localStorage.setItem(cacheKeyRunsheets, JSON.stringify(rsData));
            } catch (err) {
                console.error('Error loading public group page', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
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
                                            href={`/runsheet/fallback?id=${rs.id}`}
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

            <div className="flex justify-center mb-8">
                <button
                    onClick={() => setShareGroupDialog(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-border bg-background text-foreground font-bold hover:bg-muted transition-all active:scale-[0.98] shadow-sm"
                >
                    <span className="material-symbols-outlined text-lg">share</span>
                    Share Group
                </button>
            </div>

            {/* Footer */}
            <footer className="mt-auto py-8 text-center border-t border-border/10">
                <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground/40 hover:text-primary/60 transition-colors group">
                    <span className="text-[11px] font-bold tracking-widest uppercase">Powered by</span>
                    <span className="text-[13px] font-black tracking-tighter">RunsheetPro</span>
                </Link>
            </footer>

            {group && (
                <ShareGroupDialog
                    open={shareGroupDialog}
                    onClose={() => setShareGroupDialog(false)}
                    group={group}
                />
            )}
        </div>
    );
}
