import { Sidebar } from './Sidebar';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Wallet, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/ui/member-components';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile for display
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user!.id)
        .maybeSingle();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top header with hamburger, app title, and user info */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-card border-b px-4 py-3 lg:left-64 lg:px-8 overflow-x-hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Peta-eta</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <UserAvatar
                  name={userProfile?.full_name || user?.email || 'User'}
                  email={user?.email}
                  avatarUrl={userProfile?.avatar_url}
                  size="sm"
                />
                <span className="hidden sm:block text-sm font-medium">
                  {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sidebar with toggle */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="pt-16 transition-all duration-300 lg:pl-64">
        <main className="px-3 py-4 sm:p-4 lg:p-8 overflow-x-hidden">
          <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6 overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
