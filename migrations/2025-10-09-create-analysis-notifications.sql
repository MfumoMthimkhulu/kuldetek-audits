-- Migration: Create analysis_notifications table and RLS policies
-- Created: 2025-10-09
-- Purpose: Ensure the analysis_notifications table exists and that row-level security
-- policies allow authenticated users to read/update their own notifications.

-- NOTE: Run this in your Supabase SQL editor for the target project.

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.analysis_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_id UUID NOT NULL,
  shared_by UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'analysis_shared',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT analysis_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT fk_analysis_notifications_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_analysis_notifications_analysis FOREIGN KEY (analysis_id) REFERENCES public.audit_analysis (id) ON DELETE CASCADE,
  CONSTRAINT fk_analysis_notifications_shared_by FOREIGN KEY (shared_by) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT chk_notification_type CHECK (notification_type IN ('analysis_shared', 'analysis_updated', 'analysis_comment'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analysis_notifications_user_id ON public.analysis_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_notifications_analysis_id ON public.analysis_notifications(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_notifications_is_read ON public.analysis_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_analysis_notifications_created_at ON public.analysis_notifications(created_at);

-- Enable Row Level Security (idempotent)
ALTER TABLE public.analysis_notifications ENABLE ROW LEVEL SECURITY;

-- Create/replace policies to allow users to read and update their own notifications
-- DROP and CREATE is used to make this file idempotent and safe to re-run.

DROP POLICY IF EXISTS users_select_own_notifications ON public.analysis_notifications;
CREATE POLICY users_select_own_notifications
  ON public.analysis_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS users_update_own_notifications ON public.analysis_notifications;
CREATE POLICY users_update_own_notifications
  ON public.analysis_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- (Optional) If you want to allow deletes from clients, uncomment and adjust the policy below
-- DROP POLICY IF EXISTS users_delete_own_notifications ON public.analysis_notifications;
-- CREATE POLICY users_delete_own_notifications
--   ON public.analysis_notifications
--   FOR DELETE
--   USING (auth.uid() = user_id);

COMMENT ON TABLE public.analysis_notifications IS 'Stores notifications for shared analyses and other analysis-related events';
COMMENT ON COLUMN public.analysis_notifications.notification_type IS 'Type of notification: analysis_shared, analysis_updated, analysis_comment';

-- End of migration
