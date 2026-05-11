-- ============================================
-- Supabase Migration Script
-- App: Cash Management System (Gestione Casse)
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Table: user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT,
  cognome TEXT,
  telefono TEXT,
  ruolo TEXT NOT NULL DEFAULT 'operatore',
  status TEXT NOT NULL DEFAULT 'attivo',
  username TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- ============================================
-- Table: cashes
-- ============================================
CREATE TABLE IF NOT EXISTS cashes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cash_type TEXT NOT NULL,
  saldo_teorico DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'chiusa',
  current_operator_id TEXT,
  current_shift_id INTEGER,
  notes TEXT,
  last_physical_balance DOUBLE PRECISION,
  last_operator_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: vlts
-- ============================================
CREATE TABLE IF NOT EXISTS vlts (
  id SERIAL PRIMARY KEY,
  codice TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'attiva',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: betsmarts
-- ============================================
CREATE TABLE IF NOT EXISTS betsmarts (
  id SERIAL PRIMARY KEY,
  codice TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'attivo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: movements
-- ============================================
CREATE TABLE IF NOT EXISTS movements (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT,
  tipo_movimento TEXT NOT NULL,
  importo DOUBLE PRECISION NOT NULL,
  cassa_origine_id INTEGER REFERENCES cashes(id),
  cassa_destinazione_id INTEGER REFERENCES cashes(id),
  saldo_origine_prima DOUBLE PRECISION,
  saldo_origine_dopo DOUBLE PRECISION,
  saldo_destinazione_prima DOUBLE PRECISION,
  saldo_destinazione_dopo DOUBLE PRECISION,
  shift_id INTEGER,
  vlt_id INTEGER REFERENCES vlts(id),
  betsmart_id INTEGER REFERENCES betsmarts(id),
  causale TEXT,
  notes TEXT,
  status TEXT DEFAULT 'completato',
  riferimento_movimento_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_user_id ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_shift_id ON movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_movements_cassa_origine ON movements(cassa_origine_id);
CREATE INDEX IF NOT EXISTS idx_movements_cassa_destinazione ON movements(cassa_destinazione_id);

-- ============================================
-- Table: shifts
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT,
  cash_id INTEGER NOT NULL REFERENCES cashes(id),
  cash_name TEXT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  saldo_teorico_apertura DOUBLE PRECISION,
  saldo_fisico_apertura DOUBLE PRECISION,
  discrepanza_apertura DOUBLE PRECISION,
  note_apertura TEXT,
  saldo_teorico_chiusura DOUBLE PRECISION,
  saldo_fisico_chiusura DOUBLE PRECISION,
  discrepanza_chiusura DOUBLE PRECISION,
  note_chiusura TEXT,
  status TEXT NOT NULL DEFAULT 'aperto',
  totale_incassi DOUBLE PRECISION,
  totale_pagamenti DOUBLE PRECISION,
  totale_sovvenzioni DOUBLE PRECISION,
  totale_restituzioni DOUBLE PRECISION,
  totale_svuotamenti DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_cash_id ON shifts(cash_id);

-- ============================================
-- Table: discrepancies
-- ============================================
CREATE TABLE IF NOT EXISTS discrepancies (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT,
  shift_id INTEGER NOT NULL REFERENCES shifts(id),
  cash_id INTEGER NOT NULL REFERENCES cashes(id),
  cash_name TEXT,
  tipo TEXT NOT NULL,
  saldo_teorico DOUBLE PRECISION NOT NULL,
  saldo_fisico DOUBLE PRECISION NOT NULL,
  differenza DOUBLE PRECISION NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'aperta',
  verificato_da TEXT,
  verificato_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discrepancies_shift_id ON discrepancies(shift_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_cash_id ON discrepancies(cash_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Disable RLS for now (app uses custom auth, not Supabase Auth)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE cashes DISABLE ROW LEVEL SECURITY;
ALTER TABLE vlts DISABLE ROW LEVEL SECURITY;
ALTER TABLE betsmarts DISABLE ROW LEVEL SECURITY;
ALTER TABLE movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE discrepancies DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Seed Admin User
-- Password: Test123! (bcrypt hash)
-- ============================================
INSERT INTO user_profiles (user_id, nome, cognome, telefono, ruolo, status, username, password_hash)
VALUES (
  'admin-001',
  'Admin',
  'Sistema',
  '+39 000 0000000',
  'admin',
  'attivo',
  'admin1@trezzanosnai.it',
  '$2b$12$LJ3m4ys3GZ8kPqNFAYCrruB8SQx0bVyXHGDAv5bNdPj3RKvOqFKuS'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  ruolo = EXCLUDED.ruolo,
  status = EXCLUDED.status;

-- ============================================
-- Function to auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cashes_updated_at BEFORE UPDATE ON cashes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vlts_updated_at BEFORE UPDATE ON vlts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_betsmarts_updated_at BEFORE UPDATE ON betsmarts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movements_updated_at BEFORE UPDATE ON movements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discrepancies_updated_at BEFORE UPDATE ON discrepancies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();