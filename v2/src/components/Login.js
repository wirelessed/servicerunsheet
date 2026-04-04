'use client';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";

export default function Login() {
    const { googleSignIn } = useAuth();

    return (
        <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden px-4">
            {/* Animated gradient background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[40%] -left-[20%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute -bottom-[30%] -right-[15%] w-[500px] h-[500px] rounded-full bg-primary/6 blur-[100px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px] animate-pulse" style={{ animationDuration: '7s', animationDelay: '1s' }} />
            </div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03]"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            <div className="relative z-10 w-full max-w-sm page-enter">
                {/* Logo / Brand */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/15 mb-6 shadow-lg shadow-primary/10">
                        <span className="material-symbols-outlined text-primary text-3xl icon-filled">event_note</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                        RunsheetPro
                    </h1>
                    <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed max-w-[280px] mx-auto">
                        Plan, manage, and operate your events with precision.
                    </p>
                </div>

                {/* Sign in card */}
                <div className="glass rounded-2xl border border-border/50 p-8 shadow-xl">
                    <Button
                        variant="default"
                        size="lg"
                        className="w-full font-semibold gap-3 h-12 text-[15px] rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 active:scale-[0.98]"
                        onClick={googleSignIn}
                    >
                        <GoogleIcon style={{ fontSize: 20 }} />
                        Continue with Google
                    </Button>

                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-border/60"></div>
                        <span className="text-xs font-medium text-muted-foreground">SECURE LOGIN</span>
                        <div className="flex-1 h-px bg-border/60"></div>
                    </div>

                    <p className="text-center text-[11px] text-muted-foreground mt-4 leading-relaxed">
                        By signing in, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-muted-foreground/60 mt-8">
                    © 2026 RunsheetPro • Built for production teams
                </p>
            </div>
        </div>
    );
}
