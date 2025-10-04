import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Wallet } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top header with hamburger and app title */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-card border-b px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Peta-eta</span>
        </div>
      </header>

      {/* Sidebar with toggle */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="pt-16 transition-all duration-300">
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
