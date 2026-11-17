import GroupPageClient from './client';
import { Suspense } from 'react';

export default function GroupPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse font-medium">Loading...</p>
            </div>
        }>
            <GroupPageClient />
        </Suspense>
    );
}

export async function generateStaticParams() {
    return [{ token: 'fallback' }];
}
