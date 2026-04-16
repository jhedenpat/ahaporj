-- ============================================================
-- Patricia Bakeshop - COMPLETE SYSTEM SETUP
-- ============================================================
-- This script creates EVERYTHING: tables, triggers, views, and functions.
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. CLEANUP (Optional - uncomment if you want to start fresh)
-- DROP VIEW IF EXISTS public.customer_summary;
-- DROP TABLE IF EXISTS public.reviews CASCADE;
-- DROP TABLE IF EXISTS public.product_requests CASCADE;
-- DROP TABLE IF EXISTS public.monthly_summaries CASCADE;
-- DROP TABLE IF EXISTS public.settings CASCADE;
-- DROP TABLE IF EXISTS public.admins CASCADE;
-- DROP TABLE IF EXISTS public.orders CASCADE;
-- DROP TABLE IF EXISTS public.expenses CASCADE;
-- DROP TABLE IF EXISTS public.products CASCADE;

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock        INTEGER NOT NULL DEFAULT 0,
  image        TEXT,
  category     TEXT DEFAULT 'General',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerName" TEXT NOT NULL,
  telegram_id    TEXT,
  username       TEXT,
  items          JSONB NOT NULL DEFAULT '[]'::jsonb,
  total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  date           TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  date        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Other',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. TELEGRAM PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.telegram_profiles (
  id          TEXT PRIMARY KEY,
  first_name  TEXT NOT NULL,
  username    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL,
  telegram_id  TEXT NOT NULL,
  first_name   TEXT NOT NULL,
  username     TEXT,
  rating       SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. PRODUCT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.product_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id  TEXT NOT NULL,
  first_name   TEXT NOT NULL,
  username     TEXT,
  product_name TEXT NOT NULL,
  description  TEXT,
  quantity     INTEGER DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'noted', 'declined', 'completed', 'archived')),
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. MONTHLY SUMMARIES TABLE
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

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS) - Basic Public Access
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Simple "everyone can do everything" policies for internal business apps
-- (Harden these if you have public logins)
CREATE POLICY "Public Access" ON public.products FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.orders FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.admins FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.settings FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.telegram_profiles FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.reviews FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.product_requests FOR ALL USING (true);
CREATE POLICY "Public Access" ON public.monthly_summaries FOR ALL USING (true);

-- ============================================================
-- 12. VIEWS
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
GROUP BY COALESCE(telegram_id, username, "customerName"), "customerName", telegram_id, username
ORDER BY last_order_date DESC;

-- ============================================================
-- 13. FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: Recalculate Monthly Summary
CREATE OR REPLACE FUNCTION public.recalculate_monthly_summary()
RETURNS TRIGGER AS $$
DECLARE
  target_month INT;
  target_year INT;
  rev NUMERIC(12,2);
  exp NUMERIC(12,2);
  cnt INT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_month := EXTRACT(MONTH FROM OLD.date::TIMESTAMPTZ);
    target_year := EXTRACT(YEAR FROM OLD.date::TIMESTAMPTZ);
  ELSE
    target_month := EXTRACT(MONTH FROM NEW.date::TIMESTAMPTZ);
    target_year := EXTRACT(YEAR FROM NEW.date::TIMESTAMPTZ);
  END IF;

  SELECT COALESCE(SUM(total), 0), COUNT(*) INTO rev, cnt FROM public.orders
  WHERE EXTRACT(MONTH FROM date::TIMESTAMPTZ) = target_month AND EXTRACT(YEAR FROM date::TIMESTAMPTZ) = target_year;

  SELECT COALESCE(SUM(amount), 0) INTO exp FROM public.expenses
  WHERE EXTRACT(MONTH FROM date::TIMESTAMPTZ) = target_month AND EXTRACT(YEAR FROM date::TIMESTAMPTZ) = target_year;

  INSERT INTO public.monthly_summaries (month, year, total_revenue, total_expenses, net_profit, total_orders, updated_at)
  VALUES (target_month, target_year, rev, exp, (rev - exp), cnt, NOW())
  ON CONFLICT (month, year) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_expenses = EXCLUDED.total_expenses,
    net_profit = EXCLUDED.net_profit,
    total_orders = EXCLUDED.total_orders,
    updated_at = EXCLUDED.updated_at;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Orders
DROP TRIGGER IF EXISTS on_order_change ON public.orders;
CREATE TRIGGER on_order_change AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.recalculate_monthly_summary();

-- Trigger for Expenses
DROP TRIGGER IF EXISTS on_expense_change ON public.expenses;
CREATE TRIGGER on_expense_change AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.recalculate_monthly_summary();

-- Function: Atomic Stock Deduction
CREATE OR REPLACE FUNCTION public.deduct_stock(product_id UUID, quantity_to_deduct INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - quantity_to_deduct)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 14. DEFAULT DATA
-- ============================================================
INSERT INTO public.admins (username, password)
VALUES ('joanlablab', 'maganda')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES
  ('telegram_bot_name', 'AHAINNOVATION_bot'),
  ('facebook_url', 'https://www.facebook.com'),
  ('tele_bot_token', '8443497818:AAHMU11H1AqufpN5jyeG0ciDLt1W3V-ZUw4'),
  ('admin_tele_id', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 15. ENABLE REALTIME
-- ============================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_summaries;
