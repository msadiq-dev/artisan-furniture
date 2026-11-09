'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintReceiptButton({ className = '' }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className={`no-print gap-2 min-h-[44px] text-xs font-medium text-[#26262B] border-[#DDD6C8] hover:bg-[#FAF7F0] ${className}`}
    >
      <Printer className="h-4 w-4" />
      <span>Print Receipt</span>
    </Button>
  );
}
