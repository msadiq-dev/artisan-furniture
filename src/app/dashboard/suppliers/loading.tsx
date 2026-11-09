import { Skeleton } from '@/components/ui/skeleton';

export default function SuppliersLoading() {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#DDD6C8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <Skeleton className="h-10 w-full max-w-md" />

      <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-[#EFECE6]">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-[#FAF8F5]">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
