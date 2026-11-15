/**
 * Server-side share-link validation.
 *
 * Firestore rules only let members read runsheets. Anyone holding a share link
 * (runsheet token or group token) goes through these callables instead: the
 * token is checked here with the Admin SDK, and only display fields are
 * returned — never memberEmails, roles, shareToken or createdBy.
 *
 * If the caller is signed in, a valid token also enrolls them as a viewer so the
 * client can switch to live Firestore listeners afterwards.
 */
const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const RUNSHEET_PUBLIC_FIELDS = ['name', 'date', 'time', 'category', 'groupId', 'lastUpdated', 'orderCount', 'notes'];
const GROUP_LIST_FIELDS = ['name', 'date', 'time', 'category', 'lastUpdated'];
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function pick(data, fields) {
    const out = {};
    for (const f of fields) {
        if (data[f] !== undefined) out[f] = data[f];
    }
    return out;
}

function tokensMatch(expected, given) {
    if (typeof expected !== 'string' || typeof given !== 'string' || !expected || !given) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireId(value, name) {
    if (typeof value !== 'string' || !ID_RE.test(value)) {
        throw new HttpsError('invalid-argument', `Invalid ${name}`);
    }
    return value;
}

function isAnonymous(request) {
    return request.auth?.token?.firebase?.sign_in_provider === 'anonymous';
}

function publicMeta(id, data) {
    return { id, ...pick(data, RUNSHEET_PUBLIC_FIELDS) };
}

function callerEmail(request) {
    const t = request.auth?.token;
    if (!t?.email || t.email_verified === false) return null;
    return t.email;
}

const KNOWN_ROLES = ['owner', 'editor', 'viewer'];

/**
 * Adds `email` as a member of the runsheet. Never lowers a role the person already
 * holds: the roles map is checked first, then the legacy users subcollection (older
 * runsheets kept the creator's role only there). New members become viewers.
 */
async function enrollInBatch(batch, rsRef, data, email) {
    const mapRole = data.roles?.[email] || data.roles?.[email.toLowerCase()] || null;
    const inMembers = Array.isArray(data.memberEmails) && data.memberEmails.includes(email);
    if (KNOWN_ROLES.includes(mapRole) && data.roles?.[email] && inMembers) {
        return { role: mapRole, changed: false, added: false };
    }

    let role = KNOWN_ROLES.includes(mapRole) ? mapRole : null;
    if (!role) {
        const sub = await rsRef.collection('users').doc(email).get();
        const subRole = sub.exists ? sub.data().role : null;
        role = KNOWN_ROLES.includes(subRole) ? subRole : 'viewer';
    }

    const updateArgs = ['memberEmails', FieldValue.arrayUnion(email)];
    // FieldPath handles the dots in email addresses.
    if (data.roles?.[email] !== role) updateArgs.push(new FieldPath('roles', email), role);
    batch.update(rsRef, ...updateArgs);
    batch.set(rsRef.collection('users').doc(email), { id: email, email, role }, { merge: true });
    batch.set(db.doc(`users/${email}/runsheets/${rsRef.id}`), { id: rsRef.id }, { merge: true });
    // `added` is true only when the runsheet is new to this person's list.
    return { role, changed: true, added: !inMembers };
}

async function groupTokenValid(groupId, token) {
    if (!groupId || !token) return false;
    const g = await db.doc(`groups/${groupId}`).get();
    return g.exists && tokensMatch(g.data().shareToken, token);
}

exports.getSharedRunsheet = onCall(async (request) => {
    const id = requireId(request.data?.id, 'id');
    const token = request.data?.token;
    if (typeof token !== 'string' || !token) throw new HttpsError('permission-denied', 'Invalid link');

    const rsRef = db.doc(`runsheets/${id}`);
    const snap = await rsRef.get();
    // Same error for missing and wrong-token so ids can't be probed.
    if (!snap.exists) throw new HttpsError('permission-denied', 'Invalid link');
    const data = snap.data();

    const ok = tokensMatch(data.shareToken, token) || (await groupTokenValid(data.groupId, token));
    if (!ok) throw new HttpsError('permission-denied', 'Invalid link');

    const progSnap = await rsRef.collection('programme').orderBy('orderCount', 'asc').get();
    const programme = progSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    let role = null;
    let enrolled = false;
    const email = callerEmail(request);
    if (email) {
        const batch = db.batch();
        const res = await enrollInBatch(batch, rsRef, data, email);
        if (res.changed) await batch.commit();
        role = res.role;
        // Drives the "Saved to your runsheet list" toast: only for people it was just added for.
        enrolled = res.added;
    }

    // Anonymous visitors get a viewer pass so they can live-listen to the
    // email-free data (programme + public/meta). The pass stores the token it
    // was issued for; rules reject it once the runsheet's token is rotated.
    let livePass = false;
    // Group-link visitors are bound to the runsheet's own token too. Older runsheets
    // may have none yet; mint one so the pass has something to be checked against.
    if (isAnonymous(request)) {
        const batch = db.batch();
        if (typeof data.shareToken !== 'string' || !data.shareToken) {
            data.shareToken = crypto.randomBytes(12).toString('base64url');
            batch.update(rsRef, { shareToken: data.shareToken });
        }
        batch.set(rsRef.collection('viewers').doc(request.auth.uid), {
            token: data.shareToken,
            createdAt: FieldValue.serverTimestamp(),
        });
        // Backfill for runsheets not edited since the sync trigger was deployed.
        batch.set(rsRef.collection('public').doc('meta'), publicMeta(id, data));
        await batch.commit();
        livePass = true;
    }

    return {
        livePass,
        runsheet: publicMeta(id, data),
        programme,
        role,
        enrolled,
    };
});

exports.getSharedGroup = onCall(async (request) => {
    const rawId = requireId(request.data?.groupId, 'groupId');
    const token = typeof request.data?.token === 'string' ? request.data.token : null;
    const email = callerEmail(request);

    let groupId = rawId;
    let groupSnap = await db.doc(`groups/${groupId}`).get();
    let authorized = false;

    // Legacy short links: /group/{token}
    if (!groupSnap.exists) {
        const legacy = await db.doc(`groupTokens/${rawId}`).get();
        if (!legacy.exists) throw new HttpsError('permission-denied', 'Invalid link');
        groupId = legacy.data().groupId;
        groupSnap = await db.doc(`groups/${groupId}`).get();
        if (!groupSnap.exists) throw new HttpsError('permission-denied', 'Invalid link');
        authorized = true; // possessing a legacy token id is the credential
    }

    const group = groupSnap.data();
    if (!authorized) {
        authorized = tokensMatch(group.shareToken, token) || (!!email && group.createdBy === email);
    }
    if (!authorized) throw new HttpsError('permission-denied', 'Invalid link');

    const rsSnap = await db.collection('runsheets').where('groupId', '==', groupId).get();

    let newlyEnrolled = 0;
    if (email) {
        let batch = db.batch();
        let ops = 0;
        for (const d of rsSnap.docs) {
            const res = await enrollInBatch(batch, d.ref, d.data(), email);
            if (res.added) newlyEnrolled++;
            if (res.changed) {
                ops += 3;
                if (ops >= 450) {
                    await batch.commit();
                    batch = db.batch();
                    ops = 0;
                }
            }
        }
        if (ops > 0) await batch.commit();
    }

    return {
        group: { id: groupId, name: group.name || '' },
        // Hand back the canonical token so legacy links can be upgraded client-side.
        token: group.shareToken || token || null,
        runsheets: rsSnap.docs.map((d) => ({ id: d.id, ...pick(d.data(), GROUP_LIST_FIELDS) })),
        newlyEnrolled,
    };
});

/** Mirrors the email-free fields of each runsheet into runsheets/{id}/public/meta. */
exports.syncRunsheetPublicMeta = onDocumentWritten('runsheets/{id}', async (event) => {
    const id = event.params.id;
    const metaRef = db.doc(`runsheets/${id}/public/meta`);
    const after = event.data?.after;
    if (!after?.exists) {
        await metaRef.delete();
        return;
    }
    const next = publicMeta(id, after.data());
    const before = event.data.before?.exists ? publicMeta(id, event.data.before.data()) : null;
    if (before && JSON.stringify(before) === JSON.stringify(next)) return; // e.g. only roles changed
    await metaRef.set(next);
});
