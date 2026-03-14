'use client';
import { useAuth } from '../context/AuthContext';
import Login from '../components/Login';
import RunsheetList from '../components/Runsheet/RunsheetList';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-muted animate-spin border-t-primary"></div>
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <RunsheetList />;
}
