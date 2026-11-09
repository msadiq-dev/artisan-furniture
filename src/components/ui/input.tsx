import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex min-h-[44px] md:min-h-10 h-10 w-full rounded-[8px] border border-[#DDD6C8] bg-white px-3 py-2 text-base md:text-sm text-[#26262B] placeholder:text-[#8C867D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B6B3A] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
