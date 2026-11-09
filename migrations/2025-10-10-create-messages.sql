-- Migration: create messages table for auditor-auditee chat
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        CREATE TABLE public.messages (
            id uuid primary key DEFAULT gen_random_uuid(),
            audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
            sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            receiver_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
            message text NULL,
            attachments jsonb[] NULL,
            is_read boolean DEFAULT false,
            created_at timestamptz DEFAULT timezone('utc', now())
        );

        CREATE INDEX idx_messages_audit_id ON public.messages (audit_id);
        CREATE INDEX idx_messages_sender_id ON public.messages (sender_id);
        CREATE INDEX idx_messages_receiver_id ON public.messages (receiver_id);
    END IF;
END$$;
