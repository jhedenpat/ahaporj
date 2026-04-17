-- ============================================================
-- Patricia Bakeshop - Full Migration (Safe / Idempotent)
-- Run this in Supabase SQL Editor — safe to re-run anytime
-- ============================================================

-- ⚠️  FIX: Add missing 'category' column to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';

-- ============================================================
-- 1. ADMINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins readable by anon for login check" ON public.admins;
CREATE POLICY "Admins readable by anon for login check"
  ON public.admins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can be inserted" ON public.admins;
CREATE POLICY "Admins can be inserted"
  ON public.admins FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can be updated" ON public.admins;
CREATE POLICY "Admins can be updated"
  ON public.admins FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can be deleted" ON public.admins;
CREATE POLICY "Admins can be deleted"
  ON public.admins FOR DELETE USING (true);

-- Insert default admin credentials (change as needed):
INSERT INTO public.admins (username, password)
VALUES ('joanlablab', 'maganda')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 2. SETTINGS TABLE
-- Stores app-wide config like Telegram bot name, Facebook URL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings readable by everyone" ON public.settings;
CREATE POLICY "Settings readable by everyone"
  ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Settings writable by service" ON public.settings;
CREATE POLICY "Settings writable by service"
  ON public.settings FOR ALL USING (true);

-- Default settings
INSERT INTO public.settings (key, value) VALUES
  ('telegram_bot_name', 'AHAINNOVATION_bot'),
  ('facebook_url', 'https://www.facebook.com'),
  ('tele_bot_token', ''),
  ('admin_tele_id', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. TELEGRAM PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.telegram_profiles (
  id          TEXT PRIMARY KEY,
  first_name  TEXT NOT NULL,
  username    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.telegram_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.telegram_profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.telegram_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.telegram_profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.telegram_profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.telegram_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.telegram_profiles FOR UPDATE USING (true);

-- ============================================================
-- 4. Add telegram_id to orders (for customer tracking)
-- ============================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS telegram_id TEXT,
ADD COLUMN IF NOT EXISTS username    TEXT;

-- ============================================================
-- 5. CUSTOMER SUMMARY VIEW
-- Aggregates orders by customer for the admin dashboard
-- ============================================================
CREATE OR REPLACE VIEW public.customer_summary AS
SELECT
  COALESCE(telegram_id, username, "customerName") AS customer_key,
  "customerName"                                  AS customer_name,
  telegram_id,
  username,
  COUNT(*)::INTEGER                               AS total_orders,
  SUM(total)                                      AS total_amount,
  SUM(CASE WHEN status = 'paid'   THEN total ELSE 0 END) AS paid_amount,
  SUM(CASE WHEN status = 'unpaid' THEN total ELSE 0 END) AS unpaid_amount,
  COUNT(CASE WHEN status = 'paid'   THEN 1 END)::INTEGER AS paid_orders,
  COUNT(CASE WHEN status = 'unpaid' THEN 1 END)::INTEGER AS unpaid_orders,
  MAX(date)                                       AS last_order_date
FROM public.orders
GROUP BY COALESCE(telegram_id, "customerName"), "customerName", telegram_id
ORDER BY last_order_date DESC;

-- ============================================================
-- 6. MONTHLY SUMMARIES TABLE (Automated & Real-time)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.monthly_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month           INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year            INTEGER NOT NULL,
  total_revenue   NUMERIC(12,2) DEFAULT 0,
  total_expenses  NUMERIC(12,2) DEFAULT 0,
  net_profit      NUMERIC(12,2) DEFAULT 0,
  total_orders    INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(month, year)
);

ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Monthly summaries readable by everyone" ON public.monthly_summaries;
CREATE POLICY "Monthly summaries readable by everyone"
  ON public.monthly_summaries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Monthly summaries writable by service" ON public.monthly_summaries;
CREATE POLICY "Monthly summaries writable by service"
  ON public.monthly_summaries FOR ALL USING (true);

-- ── AUTOMATION: Real-time Summary Recalculation ───────────────

create or replace function public.recalculate_monthly_summary()
returns trigger as $$
declare
  target_month int;
  target_year int;
  rev numeric(12,2);
  exp numeric(12,2);
  cnt int;
begin
  -- Determine which month/year to update
  if (tg_op = 'DELETE') then
    target_month := extract(month from old.date::timestamptz);
    target_year := extract(year from old.date::timestamptz);
  else
    target_month := extract(month from new.date::timestamptz);
    target_year := extract(year from new.date::timestamptz);
  end if;

  -- Calculate Total Revenue from Orders
  select coalesce(sum(total), 0), count(*)
  into rev, cnt
  from public.orders
  where extract(month from date::timestamptz) = target_month 
    and extract(year from date::timestamptz) = target_year;

  -- Calculate Total Expenses
  select coalesce(sum(amount), 0)
  into exp
  from public.expenses
  where extract(month from date::timestamptz) = target_month 
    and extract(year from date::timestamptz) = target_year;

  -- Upsert into monthly_summaries
  insert into public.monthly_summaries (month, year, total_revenue, total_expenses, net_profit, total_orders, updated_at)
  values (target_month, target_year, rev, exp, (rev - exp), cnt, now())
  on conflict (month, year) do update set
    total_revenue = excluded.total_revenue,
    total_expenses = excluded.total_expenses,
    net_profit = excluded.net_profit,
    total_orders = excluded.total_orders,
    updated_at = excluded.updated_at;

  return null;
end;
$$ language plpgsql;

-- Trigger for Orders
drop trigger if exists on_order_change on public.orders;
create trigger on_order_change
after insert or update or delete on public.orders
for each row execute function public.recalculate_monthly_summary();

-- Trigger for Expenses
drop trigger if exists on_expense_change on public.expenses;
create trigger on_expense_change
after insert or update or delete on public.expenses
for each row execute function public.recalculate_monthly_summary();

-- ── MANUAL SYNC HELPER (For one-time priming or forced sync) ──

create or replace function public.recalculate_monthly_summary_manual(target_month int, target_year int)
returns void as $$
declare
  rev numeric(12,2);
  exp numeric(12,2);
  cnt int;
begin
  -- Calculate Total Revenue from Orders
  select coalesce(sum(total), 0), count(*)
  into rev, cnt
  from public.orders
  where extract(month from date::timestamptz) = target_month 
    and extract(year from date::timestamptz) = target_year;

  -- Calculate Total Expenses
  select coalesce(sum(amount), 0)
  into exp
  from public.expenses
  where extract(month from date::timestamptz) = target_month 
    and extract(year from date::timestamptz) = target_year;

  -- Upsert into monthly_summaries
  insert into public.monthly_summaries (month, year, total_revenue, total_expenses, net_profit, total_orders, updated_at)
  values (target_month, target_year, rev, exp, (rev - exp), cnt, now())
  on conflict (month, year) do update set
    total_revenue = excluded.total_revenue,
    total_expenses = excluded.total_expenses,
    net_profit = excluded.net_profit,
    total_orders = excluded.total_orders,
    updated_at = excluded.updated_at;
end;
$$ language plpgsql;

-- ============================================================
-- 7. REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Preservation: don't delete review if product is gone
  telegram_id  TEXT NOT NULL,
  first_name   TEXT NOT NULL,
  username     TEXT,
  rating       SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
CREATE POLICY "Reviews are publicly readable"
  ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Telegram users can insert their own reviews" ON public.reviews;
CREATE POLICY "Telegram users can insert their own reviews"
  ON public.reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Telegram users can delete their own reviews" ON public.reviews;
CREATE POLICY "Telegram users can delete their own reviews"
  ON public.reviews FOR DELETE USING (true);

-- ============================================================
-- 8. PRODUCT REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id  TEXT NOT NULL,
  first_name   TEXT NOT NULL,
  username     TEXT,
  product_name TEXT NOT NULL,
  description  TEXT,
  quantity     INTEGER DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'noted', 'declined', 'completed')),
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all product requests" ON public.product_requests;
CREATE POLICY "Users can view all product requests"
  ON public.product_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Telegram users can submit product requests" ON public.product_requests;
CREATE POLICY "Telegram users can submit product requests"
  ON public.product_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update product requests" ON public.product_requests;
CREATE POLICY "Users can update product requests"
  ON public.product_requests FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete product requests" ON public.product_requests;
CREATE POLICY "Users can delete product requests"
  ON public.product_requests FOR DELETE USING (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS reviews_telegram_id_idx ON public.reviews(telegram_id);
CREATE INDEX IF NOT EXISTS product_requests_telegram_id_idx ON public.product_requests(telegram_id);
CREATE INDEX IF NOT EXISTS product_requests_status_idx ON public.product_requests(status);
-- ============================================================
-- 9. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS orders_date_raw_idx ON public.orders (date);
CREATE INDEX IF NOT EXISTS expenses_date_raw_idx ON public.expenses (date);
CREATE INDEX IF NOT EXISTS orders_telegram_id_idx ON public.orders(telegram_id);
CREATE INDEX IF NOT EXISTS monthly_summaries_month_year_idx ON public.monthly_summaries(year, month);

-- ============================================================
-- 10. SOFT-DELETE FOR PRODUCTS (preserves reviews on restore)
-- ============================================================
-- Add is_available column: TRUE = visible in store, FALSE = archived/deleted
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

-- Index for fast filtering of available vs archived products
CREATE INDEX IF NOT EXISTS products_is_available_idx ON public.products(is_available);

-- ============================================================
-- 11. ENABLE REALTIME & REPLICA IDENTITY (For Instant Updates)
-- ============================================================
-- Replica Identity FULL ensures Supabase sends the complete row on updates
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

-- Re-enable Realtime for all tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products, public.orders, public.expenses, public.reviews, public.product_requests, public.settings, public.admins;
