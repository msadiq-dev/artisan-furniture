# Artisan Furniture Studio

A production-grade Next.js (App Router) + Supabase e-commerce storefront and internal operations ERP for contemporary handcrafted solid wood furniture.

---

## 1. Supabase SQL Migration Order

Run the migration scripts in the **Supabase SQL Editor** in the exact numerical sequence below:

1. **`supabase/migrations/001_schema.sql`**
   - Creates custom Postgres enums (`user_role`, `order_status`, `payment_method`, `payment_status`, `invoice_status`, `movement_type`).
   - Creates all core tables (`profiles`, `categories`, `products`, `product_images`, `customers`, `orders`, `order_items`, `suppliers`, `purchase_invoices`, `invoice_items`, `stock_movements`, `activity_logs`, `contact_messages`, `workflow_runs`).
   - Sets up automatic timestamps, indexes, and sequential order number generator.

2. **`supabase/migrations/002_rls.sql`**
   - Enables Row Level Security (RLS) on all public tables.
   - Configures column-level security on `products` for anonymous storefront visitors (explicitly revoking `cost_price`).
   - Provisions storage buckets: `product-images` (public) and `invoices` (private).
   - Establishes role-based read/write security policies.

3. **`supabase/migrations/003_functions.sql`**
   - Deploys transactional security definer RPC functions:
     - `create_order`: Validates stock, calculates delivery fee, atomically creates order, decrements stock, and logs stock movements.
     - `update_order_status`: Enforces state machine transitions; cancelling an order automatically restores stock.
     - `mark_order_payment`: Updates payment status and records activity logs.
     - `adjust_stock`: Manual audits, damage, and customer returns.
     - `verify_invoice`: Accounts verification of extracted invoice fields.
     - `review_invoice`: Manager approval or rejection with mandatory reason.
     - `receive_goods`: The ONLY place invoice stock increases into inventory.

4. **`supabase/seed.sql`** *(Optional Seed Data)*
   - Seeds initial active categories (Beds, Sofas, Chairs, Tables, Storage) and solid wood furniture pieces.

---

## 2. Creating the First Owner Account

1. Open your Supabase Project dashboard and navigate to **Authentication > Users**.
2. Click **Add User > Create User** (or sign up via the app at `/login`).
   - Email: `admin@example.com` (or your preferred admin email)
   - Credentials: Enter a secure passphrase.
   - Confirm email: Toggle on **Auto Confirm User?** to `true`.
3. In the **SQL Editor**, execute the following snippet to assign the `owner` role:
   ```sql
   insert into public.profiles (id, full_name, role, is_active)
   values (
     'YOUR_AUTH_USER_UUID',  -- Copy UUID from auth.users
     'Admin User',
     'owner',
     true
   )
   on conflict (id) do update set
     role = 'owner',
     is_active = true;
   ```
4. Log in at `/login` to access the staff dashboard at `/dashboard`.

---

## 3. Environment Variables

All sensitive and business-specific values are read from environment variables. In local development, configure these in `.env.local` (or via the Secrets panel in AI Studio / project settings in Vercel):

### Client-Accessible Variables (Browser)
These variables are rendered in storefront components and must use the `NEXT_PUBLIC_` prefix:

| Variable Name | Description & Origin |
|---|---|
| `NEXT_PUBLIC_BANK_NAME` | Bank name for wire transfer checkout (e.g. your commercial bank) |
| `NEXT_PUBLIC_BANK_ACCOUNT_TITLE` | Account title / beneficiary name on the bank account |
| `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER` | Bank account number for wire transfers |
| `NEXT_PUBLIC_BANK_IBAN` | International Bank Account Number (IBAN) for online transfers |
| `NEXT_PUBLIC_BANK_BRANCH` | Branch name or city location of the bank account |
| `NEXT_PUBLIC_SHOP_ADDRESS` | Showroom and workshop street address displayed across storefront |
| `NEXT_PUBLIC_SHOP_PHONE` | Customer service phone and WhatsApp contact number |
| `NEXT_PUBLIC_SHOP_EMAIL` | Official studio support and inquiries email address |
| `NEXT_PUBLIC_SITE_URL` | Base URL of the web application (e.g. `http://localhost:3000` or production domain) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL (Supabase Dashboard > Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/publishable key (Supabase Dashboard > Settings > API) |

### Server-Only Variables (Never Exposed to Browser)
These variables are used exclusively in server routes, API endpoints, and admin clients:

| Variable Name | Description & Origin |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role secret key for administrative DB actions (Supabase Dashboard > Settings > API) |
| `N8N_ORDER_WEBHOOK_URL` | Webhook URL for order notification workflows in n8n (optional) |
| `N8N_INVOICE_WEBHOOK_URL` | Webhook URL for automated invoice PDF extraction in n8n (optional) |
| `N8N_WEBHOOK_SECRET` | Shared secret for validating incoming and outgoing n8n webhooks (optional) |

> **Security Rule:** Never prefix server-only keys with `NEXT_PUBLIC_`. Keep `.env.local` inside `.gitignore`.

---

## 4. Local Development

### Windows PowerShell Setup
Run the following commands in Windows PowerShell (or terminal of your choice):

```powershell
# Copy example environment configuration
Copy-Item .env.example .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

### Type Checking & Linting
```powershell
npm run lint
npx tsc --noEmit
```

### Windows & Native Modules Troubleshooting
If `npm install` fails, or if a native build module such as `lightningcss` is reported missing:
1. Delete `node_modules` and `package-lock.json`
   ```powershell
   Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
   ```
2. Re-run `npm install` so npm fetches the pre-built native binaries matching your OS architecture.

Visit:
- Storefront: `http://localhost:3000`
- Catalog: `http://localhost:3000/shop`
- Staff Login: `http://localhost:3000/login`
- Staff ERP Dashboard: `http://localhost:3000/dashboard`

---

## 5. Deployment (Vercel / Cloud Run)

### Vercel Deployment
1. Push the repository to GitHub.
2. In Vercel, click **Import Project**.
3. Set the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your production URL)
   - `N8N_INVOICE_WEBHOOK_URL` (optional)
   - `N8N_ORDER_WEBHOOK_URL` (optional)
   - `N8N_WEBHOOK_SECRET` (optional)
4. Build Command: `npm run build`
5. Output Directory: `.next`
6. Deploy!

---

## 6. Security & Architectural Guarantees

- **No Secret Leaks:** Service-role key is only accessible on the server.
- **Zero Pill Discipline & Contemporary Design:** Tailored editorial design matching solid wood aesthetics.
- **RBAC Protected:** Staff routes guarded by `requireRole()` (`owner`, `manager`, `sales`, `inventory`, `accounts`).
- **All-or-Nothing RPCs:** All mutations to orders, stock balances, and invoice lifecycles execute exclusively through transactional Postgres RPCs.
