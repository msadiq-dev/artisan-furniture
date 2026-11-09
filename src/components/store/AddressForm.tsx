'use client';

import { Input } from '@/components/ui/input';
import { MapPin, User, Mail, Phone, FileText } from 'lucide-react';

export interface AddressFormData {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
}

interface AddressFormProps {
  data: AddressFormData;
  onChange: (field: keyof AddressFormData, value: string) => void;
  errors?: Partial<Record<keyof AddressFormData, string>>;
  disabled?: boolean;
}

const POPULAR_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
];

export function AddressForm({ data, onChange, errors = {}, disabled = false }: AddressFormProps) {
  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-serif text-lg font-medium text-[#26262B] border-b border-[#DDD6C8] pb-2">
          1. Customer Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="full_name" className="text-xs font-medium text-[#26262B]">
              Full Name <span className="text-[#B3402F]">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 md:top-2.5 h-4 w-4 text-[#8C867D]" />
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                enterKeyHint="next"
                required
                value={data.full_name}
                onChange={(e) => onChange('full_name', e.target.value)}
                placeholder="e.g. Customer Name"
                className={`pl-9 ${errors.full_name ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                disabled={disabled}
              />
            </div>
            {errors.full_name && (
              <p className="text-[11px] text-[#B3402F]">{errors.full_name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-medium text-[#26262B]">
              Phone Number <span className="text-[#B3402F]">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 md:top-2.5 h-4 w-4 text-[#8C867D]" />
              <Input
                id="phone"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                enterKeyHint="next"
                required
                type="tel"
                value={data.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                placeholder="0300 0000000"
                className={`pl-9 ${errors.phone ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                disabled={disabled}
              />
            </div>
            {errors.phone ? (
              <p className="text-[11px] text-[#B3402F]">{errors.phone}</p>
            ) : (
              <span className="text-[10px] text-[#8C867D]">Used for delivery call and SMS tracking</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-[#26262B]">
            Email Address <span className="text-[#8C867D] font-normal">(for receipt & updates)</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 md:top-2.5 h-4 w-4 text-[#8C867D]" />
            <Input
              id="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              type="email"
              value={data.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="customer@example.com"
              className={`pl-9 ${errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              disabled={disabled}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-[#B3402F]">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Delivery Address */}
      <div className="space-y-4 pt-2">
        <h3 className="font-serif text-lg font-medium text-[#26262B] border-b border-[#DDD6C8] pb-2">
          2. Delivery Address
        </h3>

        <div className="space-y-1.5">
          <label htmlFor="address" className="text-xs font-medium text-[#26262B]">
            Street Address, House/Apt, Sector <span className="text-[#B3402F]">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 md:top-2.5 h-4 w-4 text-[#8C867D]" />
            <Input
              id="address"
              name="address"
              autoComplete="street-address"
              enterKeyHint="next"
              required
              value={data.address}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder="House 14, Street 9, Phase 6, DHA"
              className={`pl-9 ${errors.address ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              disabled={disabled}
            />
          </div>
          {errors.address && (
            <p className="text-[11px] text-[#B3402F]">{errors.address}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="city" className="text-xs font-medium text-[#26262B]">
            City <span className="text-[#B3402F]">*</span>
          </label>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            enterKeyHint="next"
            required
            list="popular-cities"
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="Select or enter city..."
            className={errors.city ? 'border-red-400 focus-visible:ring-red-400' : ''}
            disabled={disabled}
          />
          <datalist id="popular-cities">
            {POPULAR_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.city && (
            <p className="text-[11px] text-[#B3402F]">{errors.city}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-xs font-medium text-[#26262B]">
            Delivery Notes / Landmarks <span className="text-[#8C867D] font-normal">(optional)</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 md:top-2.5 h-4 w-4 text-[#8C867D]" />
            <Input
              id="notes"
              name="notes"
              enterKeyHint="done"
              value={data.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="e.g. 2nd floor, elevator available, near main gate"
              className="pl-9"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
