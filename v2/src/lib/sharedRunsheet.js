import { signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db, getSharedRunsheet } from './firebase';

/**
 * Live view of a runsheet for a logged-out visitor holding a share token.
 *
 * 1. Signs in anonymously (invisible to the app; AuthContext ignores it).
 * 2. getSharedRunsheet validates the token server-side and issues a viewer pass.
 * 3. Listens to the email-free data: public/meta + programme.
 *
 * Falls back to polling the callable if no live pass could be issued.
 * Returns an unsubscribe function.
 */
export function subscribeSharedRunsheet(id, token, { onMeta, onProgramme, onDenied }) {
    let active = true;
    const unsubs = [];
    let pollTimer = null;

    const fetchOnce = async () => {
        try {
            const res = await getSharedRunsheet(id, token);
            if (!active) return null;
            onMeta(res.runsheet);
            onProgramme(res.programme);
            return res;
        } catch (err) {
            if (!active) return null;
            if (err?.code === 'functions/permission-denied') onDenied();
            else console.error('Shared runsheet error:', err);
            return null;
        }
    };

    const startPolling = () => {
        if (pollTimer) return;
        pollTimer = setInterval(fetchOnce, 30000);
    };

    (async () => {
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (e) {
                // Anonymous auth disabled in the console: fall back to polling.
                console.warn('Anonymous sign-in unavailable, polling instead', e?.code);
            }
        }
        if (!active) return;

        const res = await fetchOnce();
        if (!active || !res) return;
        if (!res.livePass) { startPolling(); return; }

        // A listener error (e.g. token rotated, pass now invalid) means access was revoked.
        const onError = (error) => {
            if (!active) return;
            if (error?.code === 'permission-denied') onDenied();
            else { console.error('Shared runsheet listener error:', error); startPolling(); }
        };

        unsubs.push(onSnapshot(doc(db, `runsheets/${id}/public/meta`), (snap) => {
            if (snap.exists()) onMeta({ ...snap.data(), id });
        }, onError));

        const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
        unsubs.push(onSnapshot(q, (snap) => {
            onProgramme(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, onError));
    })();

    return () => {
        active = false;
        unsubs.forEach(u => u());
        if (pollTimer) clearInterval(pollTimer);
    };
}
