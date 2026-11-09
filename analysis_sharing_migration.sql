-- Analysis Sharing Migration
-- Creates tables for sharing audit analyses and notifications

-- Create shared_analyses table
CREATE TABLE IF NOT EXISTS public.shared_analyses (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL,
    shared_by UUID NOT NULL,
    shared_with UUID NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT shared_analyses_pkey PRIMARY KEY (id),
    CONSTRAINT fk_shared_analyses_analysis FOREIGN KEY (analysis_id) REFERENCES public.audit_analysis (id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_analyses_shared_by FOREIGN KEY (shared_by) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_analyses_shared_with FOREIGN KEY (shared_with) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT unique_analysis_share UNIQUE (analysis_id, shared_with)
);

-- Create analysis_notifications table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_analyses_analysis_id ON public.shared_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_shared_by ON public.shared_analyses(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_shared_with ON public.shared_analyses(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_created_at ON public.shared_analyses(created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_notifications_user_id ON public.analysis_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_notifications_analysis_id ON public.analysis_notifications(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_notifications_is_read ON public.analysis_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_analysis_notifications_created_at ON public.analysis_notifications(created_at);

-- Create function to update updated_at timestamp for audit_analysis
CREATE OR REPLACE FUNCTION update_audit_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at on audit_analysis
CREATE TRIGGER update_audit_analysis_updated_at 
    BEFORE UPDATE ON public.audit_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_audit_analysis_updated_at();

-- Create function to create notification when analysis is shared
CREATE OR REPLACE FUNCTION create_analysis_share_notification()
RETURNS TRIGGER AS $$
DECLARE
    analysis_title TEXT;
    audit_title TEXT;
BEGIN
    -- Get analysis and audit details
    SELECT aa.analysis_type, a.title
    INTO analysis_title, audit_title
    FROM public.audit_analysis aa
    JOIN public.audits a ON aa.audit_id = a.id
    WHERE aa.id = NEW.analysis_id;
    
    -- Create notification
    INSERT INTO public.analysis_notifications (
        user_id,
        analysis_id,
        shared_by,
        notification_type,
        title,
        message
    ) VALUES (
        NEW.shared_with,
        NEW.analysis_id,
        NEW.shared_by,
        'analysis_shared',
        'Analysis Shared: ' || COALESCE(audit_title, 'Unknown Audit'),
        'Someone shared a ' || COALESCE(analysis_title, 'analysis') || 
        CASE 
            WHEN NEW.message IS NOT NULL THEN ' with you. Message: ' || NEW.message
            ELSE ' with you.'
        END
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for analysis sharing notifications
CREATE TRIGGER trigger_create_analysis_share_notification
    AFTER INSERT ON public.shared_analyses
    FOR EACH ROW EXECUTE FUNCTION create_analysis_share_notification();

-- Add comments for documentation
COMMENT ON TABLE public.shared_analyses IS 'Tracks which analyses have been shared with which users';
COMMENT ON TABLE public.analysis_notifications IS 'Stores notifications for shared analyses and other analysis-related events';
COMMENT ON COLUMN public.shared_analyses.message IS 'Optional message from the person sharing the analysis';
COMMENT ON COLUMN public.analysis_notifications.notification_type IS 'Type of notification: analysis_shared, analysis_updated, analysis_comment';