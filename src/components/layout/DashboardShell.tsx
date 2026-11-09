'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { UserRole } from '@/types/database';

interface DashboardShellProps {
  children: React.ReactNode;
  userRole?: UserRole;
  userName?: string;
}

export function DashboardShell({
  children,
  userRole = 'owner',
  userName = 'Admin',
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26262B]">
      {/* Sidebar for desktop & mobile drawer */}
      <Sidebar
        userRole={userRole}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main container offset by sidebar on desktop */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          userRole={userRole}
          userName={userName}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
