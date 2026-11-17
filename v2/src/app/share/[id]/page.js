import { Suspense } from 'react';
import ClientPage from './client';

export async function generateStaticParams() {
    return [{ id: 'fallback' }];
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <div className="w-10 h-10 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading shared runsheet...</p>
            </div>
        }>
            <ClientPage />
        </Suspense>
    );
}
