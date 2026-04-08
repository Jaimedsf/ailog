'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from './AuthProvider';
import { useState } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === '/login' || pathname === '/apresentacao') {
    return <>{children}</>;
  }

  if (!user) return null;

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <div className="layout" id="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main">
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className="content">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
