import { DashboardShell } from '@/components/layout/DashboardShell';
import { getCurrentProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login?redirect=/dashboard');
  }

  return (
    <DashboardShell userRole={profile.role} userName={profile.full_name}>
      {children}
    </DashboardShell>
  );
}
