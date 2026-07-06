'use client';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { db } from '../../lib/firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';

/**
 * ShareGroupDialog
 * Props:
 *   open            - boolean
 *   onClose         - () => void
 *   group           - { id, name }
 */
export default function ShareGroupDialog({ open, onClose, group }) {
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!open || !group) return;
        setShareUrl('');
        setCopied(false);
        setLoading(true);

        const checkGroupToken = async () => {
            const groupRef = doc(db, 'groups', group.id);
            try {
                const groupSnap = await getDoc(groupRef);
                if (groupSnap.exists()) {
                    const groupData = groupSnap.data();
                    let token = groupData.shareToken;

                    if (!token) {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                        let newToken = '';
                        for (let i = 0; i < 6; i++) {
                            newToken += chars.charAt(Math.floor(Math.random() * chars.length));
                        }

                        const batch = writeBatch(db);
                        batch.update(groupRef, { shareToken: newToken });
                        batch.set(doc(db, 'groupTokens', newToken), { groupId: group.id });
                        await batch.commit();

                        token = newToken;
                    }

                    setShareUrl(`${window.location.origin}/group/${group.id}?token=${token}`);
                }
            } catch (err) {
                console.error("Failed to check or generate group share token", err);
                setShareUrl(`${window.location.origin}/group/${group.id}`);
            } finally {
                setLoading(false);
            }
        };

        checkGroupToken();
    }, [open, group]);

    const handleCopy = () => {
        if (!shareUrl || loading) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">share</span>
                        Share Group
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    <p className="text-sm text-muted-foreground">
                        Anyone with this link can view all runsheets in <span className="font-semibold text-foreground">{group?.name}</span>. If they are logged in, all runsheets will be automatically added to their list as a viewer.
                    </p>

                    <div className="flex gap-2 mt-2">
                        <Input
                            value={loading ? '' : shareUrl}
                            placeholder={loading ? 'Generating link...' : ''}
                            readOnly
                            className="rounded-xl text-sm bg-muted/40 border-border/60 font-mono"
                            onClick={(e) => !loading && e.target.select()}
                            disabled={loading}
                        />
                        <Button
                            onClick={handleCopy}
                            className="rounded-xl shrink-0 gap-1.5"
                            variant={copied ? 'outline' : 'default'}
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-4 h-4 rounded-full border-2 border-muted border-t-background animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[16px]">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                            )}
                            {loading ? '...' : copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                    <Button
                        onClick={() => {
                            const text = `Check out this runsheet group: ${group?.name}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(shareUrl)}`, '_blank');
                        }}
                        variant="outline"
                        className="w-full rounded-xl gap-2 bg-muted border text-emerald-700 hover:bg-muted/80 border-emerald-700/20 dark:bg-transparent dark:text-[#25D366] dark:border-[#25D366]/30 dark:hover:bg-[#25D366]/10"
                        disabled={loading}
                    >
                        <WhatsAppIcon className="h-4 w-4" />
                        Share Group to Whatsapp
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
