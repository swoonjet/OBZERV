import { Link, useLocation } from 'react-router';
import { Mic, List, TrendingUp, Sparkles, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function BottomNav() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/')
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Mic className="w-6 h-6" />
          <span className="text-xs mt-1">Record</span>
        </Link>

        <Link
          to="/observations"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/observations') || isActive('/observation/')
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <List className="w-6 h-6" />
          <span className="text-xs mt-1">All</span>
        </Link>

        <Link
          to="/patterns"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/patterns')
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-xs mt-1">Patterns</span>
        </Link>

        <Link
          to="/reflect"
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/reflect')
              ? 'text-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-xs mt-1">Reflect</span>
        </Link>

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
