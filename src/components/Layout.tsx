import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="pt-16 lg:pt-0 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
