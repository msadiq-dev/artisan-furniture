import Link from 'next/link';
import { ArrowRight, Compass, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[#DDD6C8] bg-[#FAF7F0] py-12 sm:py-20 md:py-28">
      <div className="container-custom">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6B6B3A]/30 bg-[#6B6B3A]/10 px-3.5 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-[#6B6B3A]">
            <span>Master Crafted Solid Hardwoods</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight text-[#26262B] leading-[1.15] break-words">
            Furniture shaped by heritage, engineered for modern sanctuary.
          </h1>

          <p className="text-base sm:text-lg text-[#6B665E] leading-relaxed max-w-2xl">
            Pure seasoned Sheesham and solid Ash, fitted with traditional mortise-and-tenon joinery and organic finishes. Built to outlive trends and serve generations.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-3">
            <Link href="/shop" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 min-h-[44px]">
                Shop now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
                Contact us
              </Button>
            </Link>
          </div>

          {/* Quick Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-[#DDD6C8]/70 mt-8">
            <div className="flex items-center gap-3">
              <Compass className="h-5 w-5 text-[#6B6B3A] shrink-0" />
              <span className="text-xs font-medium text-[#26262B]">100% Solid Seasoned Wood</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-[#6B6B3A] shrink-0" />
              <span className="text-xs font-medium text-[#26262B]">10-Year Craft Guarantee</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-[#6B6B3A] shrink-0" />
              <span className="text-xs font-medium text-[#26262B]">Nationwide White Glove Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
