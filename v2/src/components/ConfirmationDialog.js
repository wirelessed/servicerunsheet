'use client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmationDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmStyle = 'default',
    isLoading = false
}) {
    const variant = confirmStyle === 'btn-error' || confirmStyle === 'destructive' ? 'destructive' : 'default';

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                            <span className={`material-symbols-outlined text-xl ${variant === 'destructive' ? 'text-destructive' : 'text-primary'}`}>
                                {variant === 'destructive' ? 'warning' : 'help'}
                            </span>
                        </div>
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
                    <Button variant={variant} onClick={onConfirm} className="rounded-xl shadow-sm" disabled={isLoading}>
                        {isLoading ? (
                            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2"></div>
                        ) : null}
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
