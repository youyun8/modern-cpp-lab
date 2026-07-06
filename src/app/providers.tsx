'use client';

import type { ReactNode } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import TopNav from '@/components/layout/TopNav';
import Sidebar from '@/components/layout/Sidebar';
import MobileMenu from '@/components/layout/MobileMenu';
import BottomTabBar from '@/components/layout/BottomTabBar';
import SettingsPanel from '@/components/layout/SettingsPanel';

/**
 * Client shell: initialises theme syncing and mounts the persistent chrome
 * (top nav, sidebar, mobile menu, bottom tab bar) around page content.
 */
export default function Providers({ children }: { children: ReactNode }) {
  // Side-effect only: keeps <html> class + localStorage in sync with the store.
  useDarkMode();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main
          id="main-content"
          className="flex-1 overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:px-10"
        >
          {children}
        </main>
      </div>
      <MobileMenu />
      <BottomTabBar />
      <SettingsPanel />
    </div>
  );
}
