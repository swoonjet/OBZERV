import { Outlet, useNavigate, useSearchParams } from 'react-router';
import { Toaster } from './ui/sonner';
import { BottomNav } from './BottomNav';
import { AuthView } from './AuthView';
import { SetupProfile } from './SetupProfile';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Root() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // null = not yet checked, '' = no profile exists, 'somehandle' = has profile
  const [handle, setHandle] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load profile once user is known
  useEffect(() => {
    if (!user) { setHandle(null); return; }
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('handle')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHandle(data?.handle ?? '');
        setProfileLoading(false);
      });
  }, [user?.id]);

  // After sign-in + profile loaded: if there's a pending ?follow= param, go to subscribe page
  useEffect(() => {
    const follow = searchParams.get('follow');
    if (user && handle && follow) {
      navigate(`/subscribe?h=${follow}`, { replace: true });
    }
  }, [user, handle]);

  const showSpinner = loading || (!!user && profileLoading);

  return (
    <div
      className="relative flex flex-col min-h-dvh bg-white"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Spinner — holds layout stable while auth + profile load */}
      {showSpinner && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
        </div>
      )}

      {/* Auth gate */}
      {!loading && !user && <AuthView />}

      {/* Profile setup — first-time user */}
      {!showSpinner && user && handle === '' && (
        <SetupProfile userId={user.id} onDone={(h) => setHandle(h)} />
      )}

      {/* App shell — user is authed and has a handle */}
      {!showSpinner && user && !!handle && (
        <div className="flex-1 flex flex-col bg-gray-50">
          <Outlet />
          <BottomNav />
        </div>
      )}

      <Toaster />
    </div>
  );
}
