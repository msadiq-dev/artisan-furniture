import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Artisan Furniture Studio | Handcrafted Solid Wood Furniture',
  description:
    'Premium contemporary furniture brand and studio with complete order management, catalog, and inventory operations.',
  openGraph: {
    title: 'Artisan Furniture Studio',
    description:
      'Premium contemporary furniture brand and studio with complete order management, catalog, and inventory operations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#FAF7F0] text-[#26262B]">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
