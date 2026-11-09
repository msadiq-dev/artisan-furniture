import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[8px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B6B3A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#6B6B3A] text-white hover:bg-[#5a5a31] shadow-sm',
        destructive: 'bg-[#B3402F] text-white hover:bg-[#993627] shadow-sm',
        outline: 'border border-[#DDD6C8] bg-transparent hover:bg-[#EFEAE0] text-[#26262B]',
        secondary: 'bg-[#EFEAE0] text-[#26262B] hover:bg-[#e4ddcf]',
        ghost: 'hover:bg-[#EFEAE0] text-[#26262B]',
        link: 'text-[#6B6B3A] underline-offset-4 hover:underline',
        bronze: 'bg-[#9C7A4B] text-white hover:bg-[#85673d] shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-[6px] px-3 text-xs',
        lg: 'h-12 rounded-[8px] px-8 text-base font-semibold',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
