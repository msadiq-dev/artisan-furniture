import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import type { UserRole } from '@/types/database';

interface ForbiddenProps {
  allowedRoles: UserRole[];
  userRole: UserRole;
  featureName?: string;
}

export function ForbiddenError({ allowedRoles, userRole, featureName = 'this area' }: ForbiddenProps) {
  return (
    <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-8 sm:p-12 text-center max-w-lg mx-auto my-12 space-y-5 shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#B3402F]/10 text-[#B3402F]">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#B3402F]">
          403 - Forbidden
        </span>
        <h2 className="font-serif text-2xl font-semibold text-[#26262B]">
          Access Restricted
        </h2>
      </div>

      <p className="text-sm text-[#6B665E] leading-relaxed">
        Your current staff role (<Badge variant="outline" className="font-semibold uppercase text-xs">{userRole}</Badge>)
        does not have permission to view or manage {featureName}.
      </p>

      <div className="rounded-[8px] bg-[#EFEAE0]/60 border border-[#DDD6C8] p-3 text-xs text-[#6B665E]">
        Allowed roles for this section:{' '}
        <span className="font-medium text-[#26262B]">
          {allowedRoles.map((r) => r.toUpperCase()).join(', ')}
        </span>
      </div>

      <div className="pt-2">
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
