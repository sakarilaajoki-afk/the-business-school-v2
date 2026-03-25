-- The Business School v2 — Neon Postgres Schema
-- Run this once in your Neon SQL editor

CREATE TABLE IF NOT EXISTS sessions (
  pin         VARCHAR(6)   PRIMARY KEY,
  state       JSONB        NOT NULL DEFAULT '{}',
  version     INTEGER      NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_pin_idx ON sessions (pin);
CREATE INDEX IF NOT EXISTS sessions_updated_idx ON sessions (updated_at);

-- Auto-cleanup: sessions older than 48 hours
-- Run manually or set up a cron: DELETE FROM sessions WHERE updated_at < NOW() - INTERVAL '48 hours';
