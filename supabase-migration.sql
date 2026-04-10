-- =============================================
-- Sua Casa Leblon — Supabase Schema
-- Consolidated from all 4 Replit projects
-- =============================================

-- Direct reservations (from Giro)
CREATE TABLE IF NOT EXISTS direct_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  total_value TEXT NOT NULL,
  paid TEXT,
  obs TEXT,
  synced_to_sheet BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sync logs (from Giro)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  direction TEXT NOT NULL,
  sheet_name TEXT,
  rows_affected INTEGER,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cleanings (from Limpezas) — shared with Expo app
CREATE TABLE IF NOT EXISTS cleanings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_code TEXT NOT NULL,
  cleaning_date DATE NOT NULL,
  arrival_date DATE,
  guest_count INTEGER,
  observations TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  photos JSONB DEFAULT '[]',
  cleaner_id UUID,
  cleaning_cost NUMERIC,
  source TEXT NOT NULL DEFAULT 'manual',
  manually_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contacts (from Limpezas)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  category TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance items (from Limpezas)
CREATE TABLE IF NOT EXISTS maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  frequency_days INTEGER NOT NULL,
  apartment_code TEXT,
  urgency TEXT NOT NULL DEFAULT 'media',
  photos JSONB DEFAULT '[]',
  last_done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports / Issues (from Limpezas)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  reported_by UUID NOT NULL,
  media_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users (shared between admin + Limpezas app)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'cleaner',
  avatar_url TEXT,
  pix_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cleaner payments (from Limpezas)
CREATE TABLE IF NOT EXISTS cleaner_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL,
  type TEXT NOT NULL,
  label TEXT,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses (from Limpezas)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL,
  category_id UUID,
  description TEXT,
  amount NUMERIC NOT NULL,
  receipt_photos JSONB DEFAULT '[]',
  expense_date DATE NOT NULL,
  apartment_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expense categories (from Limpezas)
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory items (from Limpezas)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages (from Limpezas)
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_by UUID NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist (from Limpezas)
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  frequency_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL,
  apartment_code TEXT NOT NULL,
  completed_by UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Deleted cleanings tracking (from Limpezas)
CREATE TABLE IF NOT EXISTS deleted_cleanings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_code TEXT NOT NULL,
  cleaning_date DATE NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now()
);

-- Booking reservations (from Leblon/Site Reservas)
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  property_code TEXT NOT NULL,
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  guests INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add extra_costs JSON field to cleanings (array of {type, description, amount})
ALTER TABLE cleanings ADD COLUMN IF NOT EXISTS extra_costs JSONB DEFAULT '[]';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cleanings_date ON cleanings(cleaning_date);
CREATE INDEX IF NOT EXISTS idx_cleanings_apt ON cleanings(apartment_code);
CREATE INDEX IF NOT EXISTS idx_direct_res_apt ON direct_reservations(apartment);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);

-- =============================================
-- Installment (Parcelamento) support for expenses
-- =============================================

-- Add installment tracking columns to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_group TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_num INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS total_installments INTEGER;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_amount NUMERIC;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_date TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_installment_group
  ON expenses(installment_group) WHERE installment_group IS NOT NULL;

-- Pending installments (future parcels awaiting their month)
CREATE TABLE IF NOT EXISTS pending_installments (
  id SERIAL PRIMARY KEY,
  installment_group TEXT NOT NULL,
  apartment_code TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  notes TEXT DEFAULT '',
  installment_num INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  original_amount NUMERIC NOT NULL,
  original_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_month_year
  ON pending_installments(year, month);
