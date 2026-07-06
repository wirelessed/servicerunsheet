'use client';
import { useState, useEffect, useRef } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PrintIcon from '@mui/icons-material/Print';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function ShareDialog({ open, onClose, runsheetId, runsheetName }) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
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

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[420px]">
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

                    <div className="text-center text-xs text-muted-foreground pt-2">
                        Edit permissions in the{" "}
                        <a
                            href={`/runsheet/${runsheetId}?tab=share`}
                            className="text-primary hover:underline font-semibold"
                        >
                            Sharing Tab
                        </a>.
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="rounded-xl">Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
