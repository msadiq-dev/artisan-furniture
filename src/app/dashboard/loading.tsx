import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title skeleton */}
      <div className="border-b border-[#DDD6C8] pb-4 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 bg-[#DDD6C8]/60" />
          <Skeleton className="h-8 w-56 bg-[#DDD6C8]/80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 bg-[#DDD6C8]/50" />
          <Skeleton className="h-9 w-28 bg-[#DDD6C8]/50" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[12px] border border-[#DDD6C8] bg-white p-5 space-y-3">
            <Skeleton className="h-4 w-24 bg-[#DDD6C8]/50" />
            <Skeleton className="h-8 w-20 bg-[#DDD6C8]/80" />
            <Skeleton className="h-3 w-32 bg-[#DDD6C8]/40" />
          </div>
        ))}
      </div>

      {/* Tables grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-36 bg-[#DDD6C8]/70" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-[#DDD6C8]/30 rounded-[6px]" />
            ))}
          </div>
        </div>

        <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-32 bg-[#DDD6C8]/70" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-[#DDD6C8]/30 rounded-[6px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
