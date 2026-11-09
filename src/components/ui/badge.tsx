import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B6B3A]',
  {
    variants: {
      variant: {
        default: 'bg-[#6B6B3A] text-white',
        secondary: 'bg-[#EFEAE0] text-[#26262B]',
        destructive: 'bg-[#B3402F]/15 text-[#B3402F] border border-[#B3402F]/20',
        outline: 'border border-[#DDD6C8] text-[#26262B]',
        bronze: 'bg-[#9C7A4B] text-white border border-[#85673d]',
        blue: 'bg-blue-100 text-blue-800 border border-blue-200',
        olive: 'bg-[#6B6B3A]/15 text-[#515128] border border-[#6B6B3A]/30',
        amber: 'bg-amber-100 text-amber-800 border border-amber-200',
        purple: 'bg-purple-100 text-purple-800 border border-purple-200',
        green: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        red: 'bg-red-100 text-red-800 border border-red-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
