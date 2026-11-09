-- Database Setup Script for Kuldetek Auditing Dashboard
-- Run this in your Supabase SQL editor to set up the required tables

-- 1. Create the audits table (if not already exists)
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
  mobile_last_screen text NULL,
  CONSTRAINT audits_pkey PRIMARY KEY (id),
  CONSTRAINT audits_auditor_id_fkey FOREIGN KEY (auditor_id) REFERENCES auth.users (id)
) TABLESPACE pg_default;

-- 2. Create system_alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    category VARCHAR(50) NOT NULL,
    source VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    created_by UUID,
    resolved_by UUID,
    CONSTRAINT system_alerts_pkey PRIMARY KEY (id),
    CONSTRAINT system_alerts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
    CONSTRAINT system_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users (id),
    CONSTRAINT chk_alert_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    CONSTRAINT chk_alert_category CHECK (category IN ('security', 'system', 'audit', 'compliance', 'performance', 'maintenance'))
);

-- 3. Create audit_progress table
CREATE TABLE IF NOT EXISTS public.audit_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT audit_progress_pkey PRIMARY KEY (id),
    CONSTRAINT audit_progress_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits (id) ON DELETE CASCADE,
    CONSTRAINT chk_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT chk_progress_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'))
);

-- 4. Create audit_metrics table
CREATE TABLE IF NOT EXISTS public.audit_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT audit_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT audit_metrics_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits (id) ON DELETE CASCADE
);

-- 5. Create audit_tasks table
CREATE TABLE IF NOT EXISTS public.audit_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'not_started',
    notes TEXT,
    findings TEXT,
    severity VARCHAR(10),
    recommendation TEXT,
    evidence TEXT[],
    evidence_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT audit_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT audit_tasks_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits (id) ON DELETE CASCADE,
    CONSTRAINT chk_task_type CHECK (task_type IN ('control_testing', 'document_review', 'interviews', 'observation', 'data_analysis')),
    CONSTRAINT chk_task_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
    CONSTRAINT chk_task_severity CHECK (severity IN ('low', 'medium', 'high'))
);

-- 6. Create audit_findings table
CREATE TABLE IF NOT EXISTS public.audit_findings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    finding_text TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL,
    recommendation TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT audit_findings_pkey PRIMARY KEY (id),
    CONSTRAINT audit_findings_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.audit_tasks (id) ON DELETE CASCADE,
    CONSTRAINT chk_finding_severity CHECK (severity IN ('low', 'medium', 'high')),
    CONSTRAINT chk_finding_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- 7. Create audit_evidence table
CREATE TABLE IF NOT EXISTS public.audit_evidence (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID,
    CONSTRAINT audit_evidence_pkey PRIMARY KEY (id),
    CONSTRAINT audit_evidence_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.audit_tasks (id) ON DELETE CASCADE
);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON public.system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_category ON public.system_alerts(category);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_progress_audit_id ON public.audit_progress(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_progress_status ON public.audit_progress(status);
CREATE INDEX IF NOT EXISTS idx_audit_metrics_audit_id ON public.audit_metrics(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_metrics_calculated_at ON public.audit_metrics(calculated_at);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_audit_id ON public.audit_tasks(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_status ON public.audit_tasks(status);
CREATE INDEX IF NOT EXISTS idx_audit_findings_task_id ON public.audit_findings(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_task_id ON public.audit_evidence(task_id);

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers for updated_at
CREATE TRIGGER update_system_alerts_updated_at 
    BEFORE UPDATE ON public.system_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_tasks_updated_at 
    BEFORE UPDATE ON public.audit_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_findings_updated_at 
    BEFORE UPDATE ON public.audit_findings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert sample data
INSERT INTO public.audits (title, category, auditor, date, status) VALUES
('Network Security Assessment', 'Security', 'John Smith', '2024-01-15', 'In Progress'),
('PCI DSS Compliance Review', 'Compliance', 'Sarah Johnson', '2024-01-20', 'Completed'),
('ISO 27001 Audit', 'Compliance', 'Mike Wilson', '2024-01-25', 'In Progress'),
('Penetration Testing', 'Security', 'Alex Brown', '2024-02-01', 'Not Started'),
('Data Privacy Assessment', 'Privacy', 'Emma Davis', '2024-02-05', 'In Progress')
ON CONFLICT (id) DO NOTHING;

-- Insert sample system alerts
INSERT INTO public.system_alerts (title, description, severity, category, source, metadata) VALUES
('Unauthorized Access Attempt', 'Multiple failed login attempts detected from IP 192.168.1.105', 'high', 'security', 'Firewall', '{"ip": "192.168.1.105", "attempts": 5, "timeframe": "5 minutes"}'),
('Database Backup Failed', 'Scheduled backup process encountered an error', 'medium', 'system', 'Backup Service', '{"error_code": "DB_001", "retry_count": 3}'),
('SSL Certificate Expiring', 'SSL certificate for audit.kuldetek.example expires in 15 days', 'medium', 'security', 'Certificate Monitor', '{"domain": "audit.kuldetek.example", "expiry_date": "2024-02-15"}'),
('High CPU Usage', 'Server CPU usage exceeded 85% for 10 minutes', 'low', 'performance', 'System Monitor', '{"cpu_usage": 87.5, "duration": "10 minutes"}'),
('Firewall Rule Update Required', 'New security policy requires firewall rule updates', 'medium', 'compliance', 'Security Policy', '{"policy_version": "v2.1", "affected_rules": 12}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample audit progress data
INSERT INTO public.audit_progress (audit_id, progress_percentage, status, notes) 
SELECT 
    id,
    CASE 
        WHEN status = 'In Progress' THEN FLOOR(RANDOM() * 60) + 20
        WHEN status = 'Completed' THEN 100
        ELSE 0
    END,
    CASE 
        WHEN status = 'In Progress' THEN 'in_progress'
        WHEN status = 'Completed' THEN 'completed'
        WHEN status = 'Not Started' THEN 'not_started'
        ELSE 'not_started'
    END,
    CASE 
        WHEN status = 'In Progress' THEN 'Fieldwork in progress - collecting evidence and documentation'
        WHEN status = 'Completed' THEN 'Audit completed successfully - all findings documented'
        ELSE 'Audit scheduled - preparation phase'
    END
FROM public.audits
ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.audits IS 'Main audits table containing audit information and status';
COMMENT ON TABLE public.system_alerts IS 'System alerts and notifications for security, system, and compliance issues';
COMMENT ON TABLE public.audit_progress IS 'Progress tracking for individual audits';
COMMENT ON TABLE public.audit_metrics IS 'Metrics and analytics data for audits';
COMMENT ON TABLE public.audit_tasks IS 'Individual tasks within audits';
COMMENT ON TABLE public.audit_findings IS 'Findings discovered during audit tasks';
COMMENT ON TABLE public.audit_evidence IS 'Evidence files and documentation for audit tasks';
