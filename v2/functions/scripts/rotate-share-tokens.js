/**
 * One-off: invalidate every existing share link.
 *
 * - Removes `shareToken` from every runsheet and group.
 * - Deletes every `groupTokens/{id}` doc (legacy short links, each one a credential).
 * - Deletes every `runsheets/{id}/viewers/{uid}` pass (they are tied to the old tokens).
 *
 * New tokens are created when an owner/editor next opens the Share tab or dialog.
 * Members keep their access; only link holders lose it.
 *
 * Dry run (default, reads only):   node scripts/rotate-share-tokens.js
 * Apply:                           node scripts/rotate-share-tokens.js --apply
 *
 * Needs admin credentials in GOOGLE_APPLICATION_CREDENTIALS.
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const PROJECT_ID = 'servicerunsheet';
const APPLY = process.argv.includes('--apply');

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

async function main() {
    console.log(`Project: ${PROJECT_ID}   Mode: ${APPLY ? 'APPLY (writing)' : 'dry run (no writes)'}\n`);

    const [runsheets, groups, groupTokens, viewers] = await Promise.all([
        db.collection('runsheets').select('shareToken').get(),
        db.collection('groups').select('shareToken').get(),
        db.collection('groupTokens').select().get(),
        db.collectionGroup('viewers').select().get(),
    ]);

    const hasToken = (d) => d.get('shareToken') !== undefined;
    const rsWithToken = runsheets.docs.filter(hasToken);
    const groupsWithToken = groups.docs.filter(hasToken);
    // Only passes under runsheets/{id}/viewers, in case another "viewers" collection ever exists.
    const passes = viewers.docs.filter((d) => /^runsheets\/[^/]+\/viewers\/[^/]+$/.test(d.ref.path));

    console.log(`Runsheets:    ${runsheets.size} total, ${rsWithToken.length} with a share token to remove`);
    console.log(`Groups:       ${groups.size} total, ${groupsWithToken.length} with a share token to remove`);
    console.log(`groupTokens:  ${groupTokens.size} legacy link docs to delete`);
    console.log(`Viewer passes: ${passes.length} to delete`);

    if (!APPLY) {
        console.log('\nDry run only. Nothing was changed. Re-run with --apply to rotate.');
        return;
    }

    const writer = db.bulkWriter();
    let failed = 0;
    writer.onWriteError((err) => {
        if (err.failedAttempts < 5) return true; // retry
        failed++;
        console.error(`FAILED ${err.documentRef.path}: ${err.message}`);
        return false;
    });

    for (const d of rsWithToken) writer.update(d.ref, { shareToken: FieldValue.delete() });
    for (const d of groupsWithToken) writer.update(d.ref, { shareToken: FieldValue.delete() });
    for (const d of groupTokens.docs) writer.delete(d.ref);
    for (const d of passes) writer.delete(d.ref);
    await writer.close();

    console.log(failed
        ? `\nFinished with ${failed} failed writes (listed above). Re-run to retry them.`
        : '\nDone. Every existing share link is now invalid.');
    if (failed) process.exitCode = 1;
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
