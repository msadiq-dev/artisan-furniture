import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="border-b border-[#DDD6C8] pb-4 space-y-2">
        <Skeleton className="h-4 w-28 bg-[#DDD6C8]/60" />
        <Skeleton className="h-8 w-48 bg-[#DDD6C8]/80" />
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 bg-[#DDD6C8]/50 rounded-[8px]" />
        <Skeleton className="h-10 w-40 bg-[#DDD6C8]/50 rounded-[8px]" />
        <Skeleton className="h-10 w-40 bg-[#DDD6C8]/50 rounded-[8px]" />
      </div>

      <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-[#DDD6C8]/30 rounded-[6px]" />
        ))}
      </div>
    </div>
  );
}
