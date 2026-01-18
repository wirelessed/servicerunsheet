'use client';
import { useState, useEffect } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
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
import { collection, query, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ConfirmationDialog from '../ConfirmationDialog';

export default function ShareDialog({ open, onClose, runsheetId, runsheetName }) {
    const { user } = useAuth();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/runsheet/${runsheetId}`;
    const [copied, setCopied] = useState(false);

    // Editor Management
    const [editors, setEditors] = useState([]);
    const [newEditorEmail, setNewEditorEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentUserIsEditor, setCurrentUserIsEditor] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, email: null });

    useEffect(() => {
        if (!open || !runsheetId) return;

        // Real-time listener for editors
        const unsubscribe = onSnapshot(collection(db, `runsheets/${runsheetId}/users`), (snapshot) => {
            const userList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEditors(userList);

            // Check if current user is editor
            if (user?.email) {
                const me = userList.find(u => u.email === user.email);
                if (me && me.role === 'editor') {
                    setCurrentUserIsEditor(true);
                }
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
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(shareUrl)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleAddEditor = async (e) => {
        e.preventDefault();
        if (!newEditorEmail || !newEditorEmail.includes('@')) return;

        setIsLoading(true);
        try {
            const email = newEditorEmail.trim().toLowerCase();

            // 1. Add to Runsheet's users subcollection
            await setDoc(doc(db, `runsheets/${runsheetId}/users`, email), {
                email: email,
                role: 'editor',
                addedAt: new Date().toISOString(),
                addedBy: user.email
            });

            // 2. Add to User's runsheets subcollection (so they see it in their list)
            await setDoc(doc(db, `users/${email}/runsheets`, runsheetId), {
                id: runsheetId,
                role: 'editor',
                sharedBy: user.email,
                sharedAt: new Date().toISOString()
            });

            setNewEditorEmail('');
        } catch (error) {
            console.error("Error adding editor:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveEditor = async () => {
        if (!deleteConfirm.email) return;

        const emailToRemove = deleteConfirm.email;
        setIsLoading(true);
        try {
            // 1. Remove from Runsheet's users
            await deleteDoc(doc(db, `runsheets/${runsheetId}/users`, emailToRemove));

            // 2. Remove from User's runsheets
            await deleteDoc(doc(db, `users/${emailToRemove}/runsheets`, runsheetId));

            setDeleteConfirm({ open: false, email: null });
        } catch (error) {
            console.error("Error removing editor:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Share Runsheet</DialogTitle>
                        <DialogDescription>
                            Share this runsheet with your team.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-6 py-4">
                        {/* Section 1: Public Link */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium leading-none">Viewing Link</h4>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={shareUrl}
                                    readOnly
                                    className="bg-muted focus-visible:ring-0"
                                />
                                <Button size="icon" onClick={copyToClipboard} variant={copied ? "outline" : "default"} title="Copy Link">
                                    {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ContentCopyIcon className="h-4 w-4" />}
                                </Button>
                                <Button size="icon" onClick={handleShareWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white" title="Share via WhatsApp">
                                    <WhatsAppIcon className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {/* Section 2: Editors */}
                        {currentUserIsEditor && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium leading-none">Editors</h4>
                                <p className="text-xs text-muted-foreground">Editors can modify the programme and details.</p>

                                {/* Add Editor Form */}
                                <form onSubmit={handleAddEditor} className="flex gap-2">
                                    <Input
                                        placeholder="Add email address"
                                        value={newEditorEmail}
                                        onChange={(e) => setNewEditorEmail(e.target.value)}
                                        type="email"
                                    />
                                    <Button type="submit" disabled={isLoading || !newEditorEmail}>
                                        <PersonAddIcon className="h-5 w-5" />
                                    </Button>
                                </form>

                                {/* Editors List */}
                                <div className="mt-4 max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50 dark:bg-black/20">
                                    {editors.length === 0 ? (
                                        <div className="text-center text-sm text-muted-foreground py-2">No editors yet</div>
                                    ) : (
                                        editors.map((editor) => (
                                            <div key={editor.id} className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-surface-dark shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{editor.email}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize">{editor.role}</span>
                                                </div>

                                                {/* Don't allow removing self, or if not authorized (logic handled by parent check mostly) */}
                                                {editor.email !== user?.email && (
                                                    <button
                                                        onClick={() => setDeleteConfirm({ open: true, email: editor.email })}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <DeleteIcon className="text-lg" />
                                                    </button>
                                                )}
                                                {editor.email === user?.email && (
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">You</span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="secondary" onClick={onClose}>Done</Button>
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
