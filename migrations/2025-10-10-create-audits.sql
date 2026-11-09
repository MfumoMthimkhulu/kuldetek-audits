-- Migration: create audits table

CREATE TABLE IF NOT EXISTS public.audits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  auditor text NOT NULL,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'In Progress'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  last_progress_url text NULL,
  last_page text NULL,
  auditor_id uuid NULL,
  auditee_id uuid NULL,
  auditee text NULL,
  mobile_last_screen text NULL,
  CONSTRAINT audits_pkey PRIMARY KEY (id),
  CONSTRAINT audits_auditor_id_fkey FOREIGN KEY (auditor_id) REFERENCES auth.users (id)
) TABLESPACE pg_default;

-- Indexes (optional)
CREATE INDEX IF NOT EXISTS idx_audits_auditor_id ON public.audits (auditor_id);
CREATE INDEX IF NOT EXISTS idx_audits_auditee_id ON public.audits (auditee_id);
CREATE INDEX IF NOT EXISTS idx_audits_date ON public.audits (date DESC);

-- Rollback
-- DROP TABLE IF EXISTS public.audits;
