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
  Wallet,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <Wallet className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">Peta-eta</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setIsMobileOpen(false)}
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

      <div className="space-y-2 border-t p-3">
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
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-card border-b px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Peta-eta</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background transition-transform duration-300 lg:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ top: '57px' }}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r bg-card">
        {sidebarContent}
      </aside>
    </>
  );
}
