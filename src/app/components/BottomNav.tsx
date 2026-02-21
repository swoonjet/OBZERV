import { Link, useLocation } from 'react-router';
import { Mic, List, TrendingUp, Sparkles, Rss, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function BottomNav() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const tab = (to: string, icon: React.ReactNode, label: string, exact = false) => (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
        (exact ? location.pathname === to : isActive(to)) ? 'text-black' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto">
        {tab('/', <Mic className="w-6 h-6" />, 'Record', true)}
        {tab('/observations', <List className="w-6 h-6" />, 'All')}
        {tab('/stream', <Rss className="w-6 h-6" />, 'Stream')}
        {tab('/patterns', <TrendingUp className="w-6 h-6" />, 'Patterns')}
        {tab('/reflect', <Sparkles className="w-6 h-6" />, 'Reflect')}
        <button
          onClick={signOut}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors text-gray-400 hover:text-gray-600"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs mt-1">Out</span>
        </button>
      </div>
    </nav>
  );
}
