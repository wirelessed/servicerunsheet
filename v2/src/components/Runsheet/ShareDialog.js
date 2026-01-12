'use client';
import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
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

export default function ShareDialog({ open, onClose, runsheetId, runsheetName }) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/share/${runsheetId}`;
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Share Runsheet</DialogTitle>
                    <DialogDescription>
                        Anyone with this link can view the runsheet. No login required.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 py-4">
                    <Input
                        value={shareUrl}
                        readOnly
                        className="bg-muted focus-visible:ring-0"
                    />
                    <Button size="icon" onClick={copyToClipboard} variant={copied ? "outline" : "default"}>
                        {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ContentCopyIcon className="h-4 w-4" />}
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
