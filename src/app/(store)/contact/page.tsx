'use client';

import { useState } from 'react';
import { siteConfig } from '@/lib/config';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    message: '',
  });

  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      setError('Please provide your full name (minimum 2 characters).');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 5) {
      setError('Please enter a message of at least 5 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          message: formData.message.trim(),
          website: honeypot, // Honeypot
        }),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        setError(data?.error || 'Failed to submit inquiry. Please try again.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      toast.success('Inquiry submitted successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error submitting inquiry';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="container-custom py-12 space-y-12">
      <div className="border-b border-[#DDD6C8] pb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B3A]">
          Studio & Workshop
        </span>
        <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#26262B] mt-1">
          Visit Our Showroom or Send an Inquiry
        </h1>
        <p className="text-sm text-[#6B665E] mt-2 max-w-xl">
          Speak with our furniture artisans, inspect timber samples, or request custom dimensions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="font-serif text-xl font-medium text-[#26262B]">
            Send an Inquiry
          </h2>

          {submitted ? (
            <div className="rounded-[10px] border border-[#6B6B3A]/30 bg-[#6B6B3A]/10 p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-[#6B6B3A] mx-auto" />
              <h3 className="font-serif text-2xl font-medium text-[#26262B]">
                Inquiry Received
              </h3>
              <p className="text-sm text-[#6B665E] leading-relaxed max-w-sm mx-auto">
                Thank you for reaching out to Artisan Furniture. Our studio concierge will review your message and reply via email or phone within 24 hours.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ full_name: '', email: '', phone: '', message: '' });
                  }}
                >
                  Send Another Message
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot field */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-hp">Leave this blank</label>
                <input
                  id="contact-hp"
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="rounded-[8px] border border-red-200 bg-red-50 p-3.5 text-xs text-[#B3402F] flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B3402F]" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="contact-full-name" className="text-xs font-medium text-[#26262B]">
                  Full Name <span className="text-[#B3402F]">*</span>
                </label>
                <Input
                  id="contact-full-name"
                  name="full_name"
                  autoComplete="name"
                  enterKeyHint="next"
                  required
                  placeholder="e.g. Customer Name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="text-xs font-medium text-[#26262B]">
                    Email Address <span className="text-[#B3402F]">*</span>
                  </label>
                  <Input
                    id="contact-email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="next"
                    required
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-phone" className="text-xs font-medium text-[#26262B]">
                    Phone Number <span className="text-[#8C867D] font-normal">(optional)</span>
                  </label>
                  <Input
                    id="contact-phone"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    enterKeyHint="next"
                    type="tel"
                    placeholder="0300 0000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="text-xs font-medium text-[#26262B]">
                  Your Message <span className="text-[#B3402F]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  required
                  placeholder="Ask about a piece, custom timber finish, or corporate bespoke inquiries..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  disabled={loading}
                  className="w-full rounded-[8px] border border-[#DDD6C8] bg-white p-3 text-base md:text-sm text-[#26262B] placeholder:text-[#8C867D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B6B3A]"
                />
              </div>

              <Button type="submit" size="lg" disabled={loading} className="w-full gap-2 min-h-[44px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Inquiry
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Studio & Workshop Information */}
        <div className="space-y-8">
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white p-6 sm:p-8 space-y-6 shadow-sm">
            <h2 className="font-serif text-xl font-medium text-[#26262B]">
              Experience Solid Wood In Person
            </h2>
            <p className="text-sm text-[#6B665E] leading-relaxed">
              Our flagship design studio and timber workshop are open six days a week. Feel the grain of seasoned Pakistani Sheesham, select custom upholstery fabrics, and consult with our master joiners.
            </p>

            <div className="space-y-4 pt-2 border-t border-[#DDD6C8] text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#6B6B3A] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#26262B] block">Studio Address</span>
                  <span className="text-[#6B665E] leading-relaxed">{siteConfig.contact.address}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-[#6B6B3A] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#26262B] block">Phone & WhatsApp</span>
                  <a
                    href={`tel:${siteConfig.contact.phone.replace(/[^0-9+]/g, '')}`}
                    className="text-[#6B665E] hover:text-[#26262B] inline-block py-1 touch-manipulation font-medium transition-colors"
                  >
                    {siteConfig.contact.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-[#6B6B3A] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#26262B] block">Direct Email</span>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="text-[#6B665E] hover:text-[#26262B] break-all inline-block py-1 touch-manipulation font-medium transition-colors"
                  >
                    {siteConfig.contact.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-[#6B6B3A] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#26262B] block">Showroom Hours</span>
                  <span className="text-[#6B665E]">{siteConfig.contact.hours}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="rounded-[12px] border border-[#DDD6C8] bg-white overflow-hidden shadow-sm">
            <div className="relative aspect-video w-full bg-gradient-to-br from-[#EFEAE0] via-[#FAF7F0] to-[#DDD6C8] flex flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6B6B3A] text-white shadow-md mb-2">
                <MapPin className="h-6 w-6 animate-bounce" />
              </div>
              <span className="font-serif text-base font-semibold text-[#26262B]">
                Artisan Furniture Studio & Workshop
              </span>
              <span className="text-xs text-[#6B665E] mt-1 max-w-sm">
                {siteConfig.contact.address}
              </span>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-mono text-[#8C867D] border border-[#DDD6C8]">
                <span>Showroom & Workshop Location</span>
              </div>
            </div>
            <div className="p-4 bg-[#FAF7F0] border-t border-[#DDD6C8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-[#6B665E]">
              <span>Customer parking and loading bay available</span>
              <span className="font-medium text-[#6B6B3A]">Open 6 Days / Week</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
