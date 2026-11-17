import ClientPage from './client';

export async function generateStaticParams() {
    return [{ id: 'fallback' }];
}




export default function Page() {
    return <ClientPage />;
}
