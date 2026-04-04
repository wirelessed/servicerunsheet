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

    useEffect(() => {
        if (!open || !group) return;
        setShareUrl(`${window.location.origin}/group/${group.id}`);
        setCopied(false);
    }, [open, group]);

    const handleCopy = () => {
        if (!shareUrl) return;
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
                                value={shareUrl}
                                readOnly
                                className="rounded-xl text-sm bg-muted/40 border-border/60 font-mono"
                                onClick={(e) => e.target.select()}
                            />
                            <Button
                                onClick={handleCopy}
                                className="rounded-xl shrink-0 gap-1.5"
                                variant={copied ? 'outline' : 'default'}
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                    </div>
            </DialogContent>
        </Dialog>
    );
}
