import GroupPageClient from './client';

export default function GroupPage() {
    return <GroupPageClient />;
}

export async function generateStaticParams() {
    return [{ token: 'fallback' }];
}
