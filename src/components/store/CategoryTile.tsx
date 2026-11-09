import Link from 'next/link';
import type { Category } from '@/types/database';
import { ArrowUpRight } from 'lucide-react';

interface CategoryTileProps {
  category: Category;
  count?: number;
}

export function CategoryTile({ category, count }: CategoryTileProps) {
  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category.slug)}`}
      className="group relative flex flex-col justify-between rounded-[12px] border border-[#DDD6C8] bg-white p-4 sm:p-6 transition-all duration-200 hover:border-[#6B6B3A] hover:shadow-md min-h-[110px] sm:min-h-[140px]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-serif text-base sm:text-xl font-medium text-[#26262B] group-hover:text-[#6B6B3A] transition-colors line-clamp-1 break-words">
          {category.name}
        </span>
        <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-[#8C867D] group-hover:text-[#6B6B3A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
      </div>

      <div className="mt-4 sm:mt-6 flex items-center justify-between text-[11px] sm:text-xs text-[#8C867D]">
        <span className="truncate">Explore Collection</span>
        {count !== undefined && (
          <span className="font-medium text-[#6B6B3A] shrink-0 ml-1">
            {count} {count === 1 ? 'piece' : 'pieces'}
          </span>
        )}
      </div>
    </Link>
  );
}
