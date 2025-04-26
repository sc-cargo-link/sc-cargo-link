
import React from 'react';
import Sidebar from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-space-dark">
      <Sidebar />
      <main className="flex-1 py-4 px-4 md:px-8">
        <ScrollArea className="h-[calc(100vh-2rem)] pr-4">
          <div className="px-1 pb-8">
            {children}
          </div>
        </ScrollArea>
        <Toaster />
      </main>
    </div>
  );
};

export default Layout;
