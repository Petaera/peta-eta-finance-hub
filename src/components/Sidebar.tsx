import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Receipt,
  FolderOpen,
  PiggyBank,
  Bell,
  BarChart3,
  Settings,
  Moon,
  Sun,
  LogOut,
  X,
  Users,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/friends', icon: UserPlus, label: 'Friends' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => {
              onClose();
            }}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-2 border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-50 bg-background border-r transition-transform duration-300 lg:hidden flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r bg-card z-40'
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}
