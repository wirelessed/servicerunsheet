'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ArchivePage() {
    const router = useRouter();

    useEffect(() => {
        localStorage.setItem('dashboard_filter', 'archive');
        router.replace('/dashboard');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
            <div className="w-12 h-12 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
        </div>
    );
}
