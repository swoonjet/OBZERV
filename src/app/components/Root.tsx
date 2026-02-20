import { Outlet } from 'react-router';
import { Toaster } from './ui/sonner';
import { BottomNav } from './BottomNav';
import { AuthView } from './AuthView';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthView />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
      <BottomNav />
      <Toaster />
    </div>
  );
}
