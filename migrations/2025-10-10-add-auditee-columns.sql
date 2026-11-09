-- Migration: add auditee columns to audits (idempotent)

DO $$
BEGIN
  -- add auditee_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audits' AND column_name = 'auditee_id'
  ) THEN
    ALTER TABLE public.audits
      ADD COLUMN auditee_id uuid NULL;
  END IF;

  -- add auditee (text) if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audits' AND column_name = 'auditee'
  ) THEN
    ALTER TABLE public.audits
      ADD COLUMN auditee text NULL;
  END IF;

  -- create index for auditee_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_audits_auditee_id'
  ) THEN
    CREATE INDEX idx_audits_auditee_id ON public.audits (auditee_id);
  END IF;

  -- Add foreign key constraint to auth.users if not exists and column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audits' AND column_name = 'auditee_id'
  ) THEN
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public' AND tc.table_name = 'audits' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'auditee_id'
      ) THEN
        ALTER TABLE public.audits
          ADD CONSTRAINT audits_auditee_id_fkey FOREIGN KEY (auditee_id) REFERENCES auth.users (id);
      END IF;
    EXCEPTION WHEN duplicate_object THEN
      -- ignore
    END;
  END IF;
END$$;

-- Rollback (manual):
-- ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_auditee_id_fkey;
-- DROP INDEX IF EXISTS idx_audits_auditee_id;
-- ALTER TABLE public.audits DROP COLUMN IF EXISTS auditee_id;
-- ALTER TABLE public.audits DROP COLUMN IF EXISTS auditee;
