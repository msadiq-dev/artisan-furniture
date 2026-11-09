export const LOW_STOCK_THRESHOLD = 3;
export const DELIVERY_FEE = 2500;
export const FREE_DELIVERY_THRESHOLD = 150000;

export const siteConfig = {
  name: 'Artisan Furniture',
  tagline: 'Timeless Contemporary Wooden Furniture',
  description: 'Handcrafted solid wood furniture built with precision, durability, and contemporary warmth.',
  currency: {
    code: 'PKR',
    symbol: 'Rs',
    locale: 'en-PK',
  },
  timezone: 'Asia/Karachi',
  shipping: {
    deliveryFee: DELIVERY_FEE,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    maxPerItemQuantity: 20,
  },
  pagination: {
    shopPageSize: 12,
    dashboardPageSize: 20,
    activityLogSize: 15,
  },
  contact: {
    address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || 'Plot 00, Demo Industrial Area, Karachi, Pakistan',
    phone: process.env.NEXT_PUBLIC_SHOP_PHONE || '+92 300 0000000',
    email: process.env.NEXT_PUBLIC_SHOP_EMAIL || 'hello@example.com',
    hours: 'Monday – Saturday: 10:00 AM – 8:00 PM (PKT)',
  },
  bankDetails: {
    bankName: process.env.NEXT_PUBLIC_BANK_NAME || 'Demo Bank Ltd',
    accountTitle: process.env.NEXT_PUBLIC_BANK_ACCOUNT_TITLE || 'Demo Account Title',
    accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '0000-0000000-00',
    iban: process.env.NEXT_PUBLIC_BANK_IBAN || 'PK00DEMO0000000000000000',
    branch: process.env.NEXT_PUBLIC_BANK_BRANCH || 'Demo Branch',
    instructions: 'Please transfer the exact order amount within 24 hours and keep your transaction ID handy for reference.',
  },
  urls: {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
};
