import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

export default function WhatsNewDialog({ open, onClose }) {
    const [showPrevious, setShowPrevious] = useState(false);
    const features = [
        { icon: "dark_mode", title: "Dark Mode", desc: "Toggle between light and dark themes." },
        { icon: "folder_shared", title: "Groups & Sharing", desc: "Organize and secure access to multiple runsheets." },
        { icon: "search", title: "Search & Sort", desc: "Quickly filter services on your dashboard." },
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-background border border-border sm:rounded-3xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-3xl font-extrabold tracking-tighter">What&apos;s New in v4.1</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium text-sm">
                        Last Updated: July 2026
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 py-2 text-left">
                    {/* Primary Highlight: Security */}
                    <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-destructive/5 border border-destructive/10 group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 text-destructive shrink-0 transition-transform group-hover:scale-105 mt-0.5">
                            <span className="material-symbols-outlined text-xl">security</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm tracking-tight leading-snug">New Sharing Links</span>
                            <span className="text-muted-foreground text-xs font-medium leading-relaxed mt-1">
                                For better security, generate links to runsheets and groups using the Share button. Links generated before 6 July 2026 will no longer work.
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-border/40 my-1" />

                    {/* Secondary Highlights (Accordion) */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setShowPrevious(!showPrevious)}
                            className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
                        >
                            <span>Previous Updates</span>
                            <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: showPrevious ? 'rotate(185deg)' : 'rotate(0deg)' }}>
                                keyboard_arrow_down
                            </span>
                        </button>

                        {showPrevious && (
                            <div className="flex flex-col gap-4 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                {features.map((feature, index) => (
                                    <div key={index} className="flex items-center gap-4 group">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0 transition-transform group-hover:scale-105">
                                            <span className="material-symbols-outlined text-xl">{feature.icon}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm tracking-tight leading-snug">{feature.title}</span>
                                            <span className="text-muted-foreground text-[11px] font-medium leading-snug mt-0.5">{feature.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide transition-all active:scale-[0.98]"
                    >
                        Let&apos;s run!
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
