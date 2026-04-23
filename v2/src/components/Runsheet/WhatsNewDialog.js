import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

export default function WhatsNewDialog({ open, onClose }) {
    const features = [
        { icon: "dark_mode", title: "Dark Mode", desc: "" },
        { icon: "folder_shared", title: "Groups & Share Group", desc: "" },
        { icon: "search", title: "Search & Sort", desc: "" },
        { icon: "history", title: "Past Events auto-grouped", desc: "" },
        { icon: "picture_as_pdf", title: "Export as PDF", desc: "" },
        { icon: "support_agent", title: "New and improved Ops role", desc: "" }
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-background border border-border sm:rounded-3xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-3xl font-extrabold tracking-tighter">What&apos;s New?</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium text-sm">
                        Welcome to RunsheetPro v4!
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    {features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-4 group">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0 transition-transform group-hover:scale-105">
                                <span className="material-symbols-outlined text-xl">{feature.icon}</span>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-foreground text-sm tracking-tight leading-snug">{feature.title}</span>
                                <span className="text-muted-foreground text-xs font-medium leading-snug mt-0.5">{feature.desc}</span>
                            </div>
                        </div>
                    ))}
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
