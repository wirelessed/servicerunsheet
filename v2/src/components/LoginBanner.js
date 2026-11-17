'use client';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * LoginBanner
 * Sticky top banner shown to unauthenticated users on public pages.
 * Pass `message` to customise the copy (default suits runsheet viewer).
 */
export default function LoginBanner({ message = 'Log in to save this runsheet' }) {
    const { googleSignIn } = useAuth();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="sticky top-0 z-[200] w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top-2 duration-300">
            {/* Icon + Text */}
            <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[18px] shrink-0">lock</span>
                <span className="text-sm font-semibold truncate">{message}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={googleSignIn}
                    className="px-3 py-1 rounded-lg bg-primary-foreground text-primary text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
                >
                    Log In
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    aria-label="Dismiss"
                    className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary-foreground/20 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        </div>
    );
}
