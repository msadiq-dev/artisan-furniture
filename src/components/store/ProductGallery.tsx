'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Armchair, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type { ProductImage } from '@/types/database';

interface ProductGalleryProps {
  images?: ProductImage[];
  productName: string;
  sku: string;
}

export function ProductGallery({ images = [], productName, sku }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // If no images exist, render the neutral placeholder block (4:5 ratio)
  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[12px] border border-[#DDD6C8] bg-gradient-to-br from-[#FAF7F0] to-[#EFEAE0] p-8 text-center text-[#8C867D] shadow-sm">
        <Armchair className="h-20 w-20 stroke-[1.25] text-[#8C867D]/50 mb-3" />
        <span className="font-serif text-lg font-medium text-[#26262B]">
          Artisan Solid Hardwood
        </span>
        <span className="text-xs uppercase tracking-wider text-[#8C867D] mt-1">
          SKU: {sku}
        </span>
        <p className="text-xs text-[#8C867D]/80 mt-3 max-w-xs leading-relaxed">
          Each piece is uniquely handcrafted to order in our local workshop.
        </p>
      </div>
    );
  }

  const resolveUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return `${base}/storage/v1/object/public/product-images/${path}`;
  };

  const currentImage = images[selectedIndex] || images[0];
  const currentUrl = resolveUrl(currentImage.storage_path);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display with Hover Zoom */}
      <div
        ref={imageContainerRef}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[12px] border border-[#DDD6C8] bg-[#EFEAE0] shadow-sm cursor-crosshair group"
      >
        <Image
          src={currentUrl}
          alt={currentImage.alt_text || productName}
          fill
          priority
          style={{
            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
            transform: isZoomed ? 'scale(2.0)' : 'scale(1)',
            transition: isZoomed ? 'transform 0.1s ease-out' : 'transform 0.25s ease-out',
          }}
          className="object-cover pointer-events-none"
          sizes="(max-width: 768px) 100vw, 50vw"
          referrerPolicy="no-referrer"
        />

        {/* Hover Zoom hint badge */}
        <div className={`absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs flex items-center gap-1.5 transition-opacity ${isZoomed ? 'opacity-0' : 'opacity-80'}`}>
          <ZoomIn className="h-3.5 w-3.5" />
          <span>Hover to zoom</span>
        </div>

        {images.length > 1 && (
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
              }}
              className="pointer-events-auto h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-white/95 shadow text-[#26262B] flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
              {selectedIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
              }}
              className="pointer-events-auto h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-white/95 shadow text-[#26262B] flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Swipeable Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
          {images.map((img, idx) => {
            const url = resolveUrl(img.storage_path);
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 snap-start overflow-hidden rounded-[8px] border transition-all ${
                  isSelected
                    ? 'border-[#6B6B3A] ring-2 ring-[#6B6B3A]/30'
                    : 'border-[#DDD6C8] hover:border-[#8C867D]'
                }`}
                aria-label={`View thumbnail ${idx + 1}`}
              >
                <Image
                  src={url}
                  alt={img.alt_text || `${productName} thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 64px, 80px"
                  referrerPolicy="no-referrer"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
