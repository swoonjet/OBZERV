import { Outlet } from 'react-router';
import { Toaster } from './ui/sonner';
import { BottomNav } from './BottomNav';
import { AuthView } from './AuthView';
import { useAuth } from '../context/AuthContext';

export function Root() {
  const { user, loading } = useAuth();

  // Single stable wrapper — never unmounts — so there's no layout flash
  // when auth state resolves. AuthView and the app shell fade in/out
  // inside this fixed container.
  return (
    <div
      className="relative flex flex-col min-h-dvh bg-white"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Loading — invisible but holds layout */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
        </div>
      )}

      {/* Auth gate */}
      {!loading && !user && <AuthView />}

      {/* App shell */}
      {!loading && user && (
        <div className="flex-1 flex flex-col bg-gray-50">
          <Outlet />
          <BottomNav />
        </div>
      )}

      <Toaster />
    </div>
  );
}
