import { Outlet } from 'react-router';
import { Toaster } from './ui/sonner';
import { BottomNav } from './BottomNav';

export function Root() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
      <BottomNav />
      <Toaster />
    </div>
  );
}
