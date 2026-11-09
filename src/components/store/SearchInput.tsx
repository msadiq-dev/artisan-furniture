'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  placeholder = 'Search by name, wood, SKU or collection...',
  className = '',
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';
  const [val, setVal] = useState(currentQuery);

  useEffect(() => {
    setVal(currentQuery);
  }, [currentQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set('q', val.trim());
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`/shop?${params.toString()}`);
  };

  const handleClear = () => {
    setVal('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.set('page', '1');
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 h-4 w-4 text-[#8C867D]" />
      <Input
        type="search"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-9 bg-white border-[#DDD6C8] text-sm h-11 focus-visible:ring-[#6B6B3A]"
      />
      {val && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 p-1 text-[#8C867D] hover:text-[#26262B]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}
