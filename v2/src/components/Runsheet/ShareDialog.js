'use client';
import { useState, useEffect, useRef } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { db } from '../../lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ConfirmationDialog from '../ConfirmationDialog';

export default function ShareDialog({ open, onClose, runsheetId, runsheetName }) {
    const { user } = useAuth();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const [editors, setEditors] = useState([]);
    const [newEditorEmail, setNewEditorEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentUserIsEditor, setCurrentUserIsEditor] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, email: null });
    const [loading, setLoading] = useState(true);
    const hasAttemptedRef = useRef(false);

    useEffect(() => {
        if (!open) {
            setShareUrl('');
            setCopied(false);
            setLoading(true);
            hasAttemptedRef.current = false;
        }
    }, [open]);

    useEffect(() => {
        if (!open || !runsheetId) return;
        
        let active = true;
        const runsheetRef = doc(db, 'runsheets', runsheetId);

        const checkToken = async () => {
            try {
                const snap = await getDoc(runsheetRef);
                if (snap.exists() && active) {
                    const data = snap.data();
                    let token = data.shareToken;

                    if (!token && !hasAttemptedRef.current) {
                        hasAttemptedRef.current = true;
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                        let newToken = '';
                        for (let i = 0; i < 6; i++) {
                            newToken += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        try {
                            await updateDoc(runsheetRef, { shareToken: newToken });
                            token = newToken;
                        } catch (e) {
                            console.error("Failed to generate runsheet token in ShareDialog", e);
                        }
                    }

                    if (token) {
                        setShareUrl(`${origin}/share/${runsheetId}?token=${token}`);
                    } else {
                        setShareUrl(`${origin}/share/${runsheetId}`);
                    }
                }
            } catch (err) {
                console.error("Error checking runsheet share token", err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        checkToken();
        return () => { active = false; };
    }, [open, runsheetId, origin]);

    useEffect(() => {
        if (!open || !runsheetId) return;
        const unsubscribe = onSnapshot(collection(db, `runsheets/${runsheetId}/users`), (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEditors(userList);
            if (user?.email) {
                const me = userList.find(u => u.email === user.email);
                setCurrentUserIsEditor(me?.role === 'editor' || me?.role === 'owner');
            }
        });
        return () => unsubscribe();
    }, [open, runsheetId, user]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareWhatsApp = () => {
        const text = `Check out this runsheet: ${runsheetName}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const handleExportPDF = () => {
        window.open(`/runsheet/${runsheetId}/print`, '_blank');
    };

    const handleAddEditor = async (e) => {
        e.preventDefault();
        if (!newEditorEmail || !newEditorEmail.includes('@')) return;
        setIsLoading(true);
        try {
            const email = newEditorEmail.trim().toLowerCase();

            // Check if this user already exists in the runsheet — don't overwrite their role
            const existingUserSnap = await getDoc(doc(db, `runsheets/${runsheetId}/users`, email));
            if (existingUserSnap.exists()) {
                const existingRole = existingUserSnap.data().role;
                alert(`${email} already has the "${existingRole}" role on this runsheet.`);
                setNewEditorEmail('');
                setIsLoading(false);
                return;
            }

            await setDoc(doc(db, `runsheets/${runsheetId}/users`, email), { id: email, email, role: 'editor', addedAt: new Date().toISOString(), addedBy: user.email });
            await setDoc(doc(db, `users/${email}/runsheets`, runsheetId), { id: runsheetId, role: 'editor', sharedBy: user.email, sharedAt: new Date().toISOString() });

            // Fetch and update main runsheet document
            const runsheetRef = doc(db, 'runsheets', runsheetId);
            const runsheetSnap = await getDoc(runsheetRef);
            if (runsheetSnap.exists()) {
                const data = runsheetSnap.data();
                const currentEmails = data.memberEmails || [];
                const currentRoles = data.roles || {};
                await updateDoc(runsheetRef, {
                    memberEmails: [...new Set([...currentEmails, email])],
                    roles: {
                        ...currentRoles,
                        [email]: 'editor'
                    }
                });
            }

            setNewEditorEmail('');
        } catch (error) { console.error("Error adding editor:", error); }
        finally { setIsLoading(false); }
    };

    const handleRemoveEditor = async () => {
        if (!deleteConfirm.email) return;
        setIsLoading(true);
        try {
            const email = deleteConfirm.email;
            await deleteDoc(doc(db, `runsheets/${runsheetId}/users`, email));
            await deleteDoc(doc(db, `users/${email}/runsheets`, runsheetId));

            // Fetch and update main runsheet document
            const runsheetRef = doc(db, 'runsheets', runsheetId);
            const runsheetSnap = await getDoc(runsheetRef);
            if (runsheetSnap.exists()) {
                const data = runsheetSnap.data();
                const currentEmails = data.memberEmails || [];
                const currentRoles = { ...(data.roles || {}) };
                delete currentRoles[email];
                await updateDoc(runsheetRef, {
                    memberEmails: currentEmails.filter(e => e !== email),
                    roles: currentRoles
                });
            }

            setDeleteConfirm({ open: false, email: null });
        } catch (error) { console.error("Error removing editor:", error); }
        finally { setIsLoading(false); }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">share</span>
                            Share Runsheet
                        </DialogTitle>

                    </DialogHeader>

                    <div className="flex flex-col gap-5 py-4">
                        {/* Link section */}
                        <div className="space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Viewing Link</h4>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={loading ? '' : shareUrl}
                                    placeholder={loading ? 'Generating link...' : ''}
                                    readOnly
                                    className="bg-muted/60 focus-visible:ring-0 text-sm rounded-xl font-mono"
                                    onClick={(e) => !loading && e.target.select()}
                                    disabled={loading}
                                />
                                <Button
                                    size="icon"
                                    onClick={copyToClipboard}
                                    variant={copied ? "outline" : "default"}
                                    className="shrink-0 rounded-xl"
                                    title="Copy Link"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-muted border-t-background animate-spin" />
                                    ) : copied ? (
                                        <CheckIcon className="h-4 w-4 text-success" />
                                    ) : (
                                        <ContentCopyIcon className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <Button
                                onClick={handleShareWhatsApp}
                                variant="outline"
                                className="w-full rounded-xl gap-2 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:text-[#25D366]"
                                disabled={loading}
                            >
                                <WhatsAppIcon className="h-4 w-4" />
                                Share via WhatsApp
                            </Button>
                            <Button
                                onClick={handleExportPDF}
                                variant="outline"
                                className="w-full rounded-xl gap-2 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary"
                                disabled={loading}
                            >
                                <PrintIcon className="h-4 w-4" />
                                Export as PDF
                            </Button>
                        </div>

                        <Separator />

                        {/* Editors section */}
                        {currentUserIsEditor && (
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Editors</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Editors can modify the programme and details.</p>
                                </div>

                                <form onSubmit={handleAddEditor} className="flex gap-2">
                                    <Input
                                        placeholder="Add email address"
                                        value={newEditorEmail}
                                        onChange={(e) => setNewEditorEmail(e.target.value)}
                                        type="email"
                                        className="rounded-xl"
                                    />
                                    <Button type="submit" disabled={isLoading || !newEditorEmail} className="shrink-0 rounded-xl">
                                        <PersonAddIcon className="h-4 w-4" />
                                    </Button>
                                </form>

                                <div className="max-h-[200px] overflow-y-auto space-y-1.5 scrollbar-thin">
                                    {editors.length === 0 ? (
                                        <div className="text-center text-sm text-muted-foreground py-4 bg-muted/30 rounded-xl">No editors yet</div>
                                    ) : (
                                        editors.map((editor) => (
                                            <div key={editor.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-foreground truncate">{editor.email}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize font-medium">{editor.role}</span>
                                                </div>
                                                {editor.email === user?.email ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-lg shrink-0">You</span>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm({ open: true, email: editor.email })}
                                                        className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10 shrink-0"
                                                    >
                                                        <DeleteIcon style={{ fontSize: 16 }} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose} className="rounded-xl">Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, email: null })}
                onConfirm={handleRemoveEditor}
                title="Remove Editor"
                message={`Are you sure you want to remove ${deleteConfirm.email} as an editor? They will no longer be able to edit this runsheet.`}
                confirmText="Remove"
                confirmStyle="destructive"
            />
        </>
    );
}
