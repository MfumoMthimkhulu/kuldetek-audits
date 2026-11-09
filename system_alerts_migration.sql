-- System Alerts Migration
-- Creates tables for managing system alerts and notifications

-- Create system_alerts table
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

-- Create audit_metrics table for dashboard analytics
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

-- Create audit_progress table for tracking audit completion
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON public.system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_category ON public.system_alerts(category);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_metrics_audit_id ON public.audit_metrics(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_metrics_calculated_at ON public.audit_metrics(calculated_at);
CREATE INDEX IF NOT EXISTS idx_audit_progress_audit_id ON public.audit_progress(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_progress_status ON public.audit_progress(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_system_alerts_updated_at 
    BEFORE UPDATE ON public.system_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample system alerts
INSERT INTO public.system_alerts (title, description, severity, category, source, metadata) VALUES
('Unauthorized Access Attempt', 'Multiple failed login attempts detected from IP 192.168.1.105', 'high', 'security', 'Firewall', '{"ip": "192.168.1.105", "attempts": 5, "timeframe": "5 minutes"}'),
('Database Backup Failed', 'Scheduled backup process encountered an error', 'medium', 'system', 'Backup Service', '{"error_code": "DB_001", "retry_count": 3}'),
('SSL Certificate Expiring', 'SSL certificate for audit.kuldetek.example expires in 15 days', 'medium', 'security', 'Certificate Monitor', '{"domain": "audit.kuldetek.example", "expiry_date": "2024-02-15"}'),
('High CPU Usage', 'Server CPU usage exceeded 85% for 10 minutes', 'low', 'performance', 'System Monitor', '{"cpu_usage": 87.5, "duration": "10 minutes"}'),
('Firewall Rule Update Required', 'New security policy requires firewall rule updates', 'medium', 'compliance', 'Security Policy', '{"policy_version": "v2.1", "affected_rules": 12}'),
('Audit Trail Missing', 'Audit logs for user authentication are incomplete', 'critical', 'audit', 'Audit System', '{"missing_hours": 3, "affected_users": 15}'),
('Disk Space Low', 'System disk usage is at 92% capacity', 'high', 'system', 'Storage Monitor', '{"disk_usage": 92, "available_space": "8GB"}');

-- Insert sample audit progress data
INSERT INTO public.audit_progress (audit_id, progress_percentage, status, notes) 
SELECT 
    id,
    CASE 
        WHEN status = 'In Progress' THEN FLOOR(RANDOM() * 80) + 10
        WHEN status = 'Completed' THEN 100
        ELSE 0
    END,
    CASE 
        WHEN status = 'In Progress' THEN 'in_progress'
        WHEN status = 'Completed' THEN 'completed'
        WHEN status = 'Planning' THEN 'not_started'
        WHEN status = 'On Hold' THEN 'on_hold'
        WHEN status = 'Cancelled' THEN 'cancelled'
        ELSE 'not_started'
    END,
    CASE 
        WHEN status = 'In Progress' THEN 'Audit fieldwork in progress'
        WHEN status = 'Completed' THEN 'Audit completed successfully'
        ELSE 'Audit not yet started'
    END
FROM public.audits;

-- Add comments for documentation
COMMENT ON TABLE public.system_alerts IS 'System alerts and notifications for security, system, and compliance issues';
COMMENT ON COLUMN public.system_alerts.severity IS 'Alert severity level: low, medium, high, critical';
COMMENT ON COLUMN public.system_alerts.status IS 'Alert status: active, acknowledged, resolved, dismissed';
COMMENT ON COLUMN public.system_alerts.category IS 'Alert category: security, system, audit, compliance, performance, maintenance';
COMMENT ON TABLE public.audit_metrics IS 'Metrics and analytics data for audits';
COMMENT ON TABLE public.audit_progress IS 'Progress tracking for individual audits';
