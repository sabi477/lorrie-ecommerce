-- Eski PostgreSQL volume'larında users.deleted eksik olabilir; yeni kurulumlarda init.sql zaten ekliyor (IF NOT EXISTS no-op).
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
