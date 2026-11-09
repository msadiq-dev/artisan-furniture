import Link from 'next/link';
import { siteConfig } from '@/lib/config';
import { MapPin, Phone, Mail, Clock, Truck, ShieldCheck } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-[#DDD6C8] bg-[#EFEAE0]/50 text-[#26262B] pt-12 md:pt-16 pb-12 mt-16 md:mt-20 safe-bottom">
      <div className="container-custom">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold tracking-wide">
              {siteConfig.name}
            </h3>
            <p className="text-sm text-[#6B665E] leading-relaxed">
              {siteConfig.description}
            </p>
            <div className="pt-2 text-xs text-[#8C867D]">
              All items are crafted with sustainably sourced hardwoods and finished with non-toxic oils.
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold tracking-wider text-[#26262B]">
              Explore
            </h4>
            <ul className="space-y-1.5 text-sm text-[#6B665E]">
              <li>
                <Link href="/" className="inline-block py-1.5 hover:text-[#6B6B3A] transition-colors">
                  Featured Collection
                </Link>
              </li>
              <li>
                <Link href="/shop" className="inline-block py-1.5 hover:text-[#6B6B3A] transition-colors">
                  All Furniture Catalog
                </Link>
              </li>
              <li>
                <Link href="/cart" className="inline-block py-1.5 hover:text-[#6B6B3A] transition-colors">
                  Shopping Bag
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-block py-1.5 hover:text-[#6B6B3A] transition-colors">
                  Visit Showroom & Workshop
                </Link>
              </li>
            </ul>
          </div>

          {/* Delivery & Ordering */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold tracking-wider text-[#26262B]">
              Delivery & Payment
            </h4>
            <ul className="space-y-3 text-sm text-[#6B665E]">
              <li className="flex items-start gap-2.5">
                <Truck className="h-4 w-4 mt-0.5 text-[#6B6B3A] shrink-0" />
                <span>Standard delivery Rs 2,500. Free on orders over Rs 150,000.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-[#6B6B3A] shrink-0" />
                <span>Cash on Delivery & Direct Bank Transfer accepted.</span>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold tracking-wider text-[#26262B]">
              Showroom & Contact
            </h4>
            <ul className="space-y-3 text-sm text-[#6B665E]">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 text-[#6B6B3A] shrink-0" />
                <span>{siteConfig.contact.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-[#6B6B3A] shrink-0" />
                <a href={`tel:${siteConfig.contact.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-[#6B6B3A] transition-colors">
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-[#6B6B3A] shrink-0" />
                <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-[#6B6B3A] transition-colors break-all">
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[#6B6B3A] shrink-0" />
                <span>{siteConfig.contact.hours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#DDD6C8] pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C867D] gap-4">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#6B6B3A] transition-colors underline underline-offset-2">
              Staff Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
