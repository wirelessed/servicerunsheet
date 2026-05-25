'use client';
import { useAuth } from '../../context/AuthContext';
import Login from '../../components/Login';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

export default function FeedbackPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
            <div className="w-12 h-12 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
        </div>
    );

    if (!user) return <Login />;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6 py-12 relative overflow-hidden">
            {/* Background decorations matching the app style */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[40%] -left-[20%] w-[700px] h-[700px] rounded-full bg-primary/8 blur-[140px] animate-pulse" />
                <div className="absolute -bottom-[30%] -right-[15%] w-[600px] h-[600px] rounded-full bg-primary/6 blur-[120px] animate-pulse" />
            </div>

            {/* Back to Dashboard Button */}
            <div className="absolute top-6 left-6 z-10">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard')}
                    className="gap-2 text-sm font-semibold rounded-xl"
                >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to Dashboard
                </Button>
            </div>

            <div className="relative z-10 w-full max-w-md glass border border-border/50 p-8 rounded-2xl shadow-xl text-center flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-primary text-3xl icon-filled">feedback</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>

                <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                    Click the red "Feedback" button on the bottom right corner to fill in the form.
                </p>
            </div>
        </div>
    );
}
