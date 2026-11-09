-- Sample Data Insertion for Kuldetek Auditing Dashboard
-- This script inserts sample data for testing the dashboard functionality

-- Insert sample audits
INSERT INTO public.audits (title, category, auditor, date, status, auditor_id) VALUES
('Network Security Assessment', 'Security', 'John Smith', '2024-01-15', 'In Progress', NULL),
('PCI DSS Compliance Review', 'Compliance', 'Sarah Johnson', '2024-01-20', 'Completed', NULL),
('ISO 27001 Audit', 'Compliance', 'Mike Wilson', '2024-01-25', 'In Progress', NULL),
('Penetration Testing', 'Security', 'Alex Brown', '2024-02-01', 'Not Started', NULL),
('Data Privacy Assessment', 'Privacy', 'Emma Davis', '2024-02-05', 'In Progress', NULL),
('Infrastructure Security Review', 'Security', 'David Lee', '2024-02-10', 'Completed', NULL),
('SOC 2 Type II Audit', 'Compliance', 'Lisa Chen', '2024-02-15', 'In Progress', NULL),
('Vulnerability Assessment', 'Security', 'Tom Anderson', '2024-02-20', 'Not Started', NULL),
('Access Control Review', 'Security', 'Rachel Green', '2024-02-25', 'In Progress', NULL),
('Business Continuity Audit', 'Compliance', 'Chris Taylor', '2024-03-01', 'Completed', NULL);

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
FROM public.audits;

-- Insert sample audit metrics
INSERT INTO public.audit_metrics (audit_id, metric_name, metric_value, metric_unit, calculated_at)
SELECT 
    a.id,
    'compliance_score',
    CASE 
        WHEN a.status = 'Completed' THEN 85 + FLOOR(RANDOM() * 15)
        WHEN a.status = 'In Progress' THEN 60 + FLOOR(RANDOM() * 25)
        ELSE 0
    END,
    'percentage',
    NOW() - (FLOOR(RANDOM() * 30) || ' days')::interval
FROM public.audits a;

-- Insert additional metrics for completed audits
INSERT INTO public.audit_metrics (audit_id, metric_name, metric_value, metric_unit, calculated_at)
SELECT 
    a.id,
    'findings_count',
    FLOOR(RANDOM() * 10) + 1,
    'count',
    NOW() - (FLOOR(RANDOM() * 30) || ' days')::interval
FROM public.audits a
WHERE a.status = 'Completed';

-- Insert sample system alerts (if not already inserted by migration)
INSERT INTO public.system_alerts (title, description, severity, category, source, metadata, status) VALUES
('Unauthorized Access Attempt', 'Multiple failed login attempts detected from IP 192.168.1.105', 'high', 'security', 'Firewall', '{"ip": "192.168.1.105", "attempts": 5, "timeframe": "5 minutes"}', 'active'),
('Database Backup Failed', 'Scheduled backup process encountered an error', 'medium', 'system', 'Backup Service', '{"error_code": "DB_001", "retry_count": 3}', 'active'),
('SSL Certificate Expiring', 'SSL certificate for audit.kuldetek.example expires in 15 days', 'medium', 'security', 'Certificate Monitor', '{"domain": "audit.kuldetek.example", "expiry_date": "2024-02-15"}', 'acknowledged'),
('High CPU Usage', 'Server CPU usage exceeded 85% for 10 minutes', 'low', 'performance', 'System Monitor', '{"cpu_usage": 87.5, "duration": "10 minutes"}', 'resolved'),
('Firewall Rule Update Required', 'New security policy requires firewall rule updates', 'medium', 'compliance', 'Security Policy', '{"policy_version": "v2.1", "affected_rules": 12}', 'active'),
('Audit Trail Missing', 'Audit logs for user authentication are incomplete', 'critical', 'audit', 'Audit System', '{"missing_hours": 3, "affected_users": 15}', 'active'),
('Disk Space Low', 'System disk usage is at 92% capacity', 'high', 'system', 'Storage Monitor', '{"disk_usage": 92, "available_space": "8GB"}', 'active'),
('Suspicious Network Activity', 'Unusual traffic patterns detected on port 443', 'medium', 'security', 'Network Monitor', '{"port": 443, "traffic_volume": "unusual", "duration": "2 hours"}', 'acknowledged'),
('Failed Security Scan', 'Automated security scan failed to complete', 'low', 'security', 'Security Scanner', '{"scan_type": "vulnerability", "error": "timeout"}', 'resolved'),
('Compliance Deadline Approaching', 'PCI DSS audit deadline in 30 days', 'medium', 'compliance', 'Compliance Manager', '{"deadline": "2024-03-15", "audit_type": "PCI DSS"}', 'active')
ON CONFLICT (id) DO NOTHING;

-- Update some alerts to have different timestamps for better testing
UPDATE public.system_alerts 
SET created_at = NOW() - (FLOOR(RANDOM() * 7) || ' days')::interval
WHERE id IN (
    SELECT id FROM public.system_alerts 
    ORDER BY RANDOM() 
    LIMIT 5
);

-- Insert additional recent alerts
INSERT INTO public.system_alerts (title, description, severity, category, source, metadata, status, created_at) VALUES
('New User Registration', 'New user registered with admin privileges', 'low', 'security', 'User Management', '{"user": "admin@test.com", "role": "admin"}', 'active', NOW() - '2 hours'::interval),
('System Update Available', 'Security patch available for core system', 'medium', 'system', 'Update Manager', '{"version": "v2.1.3", "security_fixes": 3}', 'active', NOW() - '1 hour'::interval),
('Memory Usage High', 'System memory usage exceeded 90%', 'high', 'performance', 'System Monitor', '{"memory_usage": 92, "available": "512MB"}', 'active', NOW() - '30 minutes'::interval);

-- Create some audit findings for completed audits
INSERT INTO public.audit_findings (task_id, finding_text, severity, recommendation, status, created_at)
SELECT 
    t.id,
    'Insufficient access controls for sensitive data',
    'high',
    'Implement role-based access control and regular access reviews',
    'open',
    NOW() - (FLOOR(RANDOM() * 10) || ' days')::interval
FROM public.audit_tasks t
JOIN public.audits a ON t.audit_id = a.id
WHERE a.status = 'Completed'
LIMIT 3;

INSERT INTO public.audit_findings (task_id, finding_text, severity, recommendation, status, created_at)
SELECT 
    t.id,
    'Missing security documentation',
    'medium',
    'Create comprehensive security policies and procedures',
    'in_progress',
    NOW() - (FLOOR(RANDOM() * 5) || ' days')::interval
FROM public.audit_tasks t
JOIN public.audits a ON t.audit_id = a.id
WHERE a.status = 'In Progress'
LIMIT 2;

-- Add some evidence for audit tasks
INSERT INTO public.audit_evidence (task_id, file_name, file_url, file_type, file_size, description, uploaded_at)
SELECT 
    t.id,
    'security_policy_' || t.id || '.pdf',
    '/evidence/security_policy_' || t.id || '.pdf',
    'application/pdf',
    1024000,
    'Security policy documentation',
    NOW() - (FLOOR(RANDOM() * 7) || ' days')::interval
FROM public.audit_tasks t
JOIN public.audits a ON t.audit_id = a.id
WHERE a.status IN ('In Progress', 'Completed')
LIMIT 5;

-- Update audit progress with more realistic data
UPDATE public.audit_progress 
SET progress_percentage = CASE 
    WHEN status = 'in_progress' THEN 25 + FLOOR(RANDOM() * 50)
    WHEN status = 'completed' THEN 100
    ELSE 0
END,
last_updated = NOW() - (FLOOR(RANDOM() * 3) || ' days')::interval
WHERE id IN (SELECT id FROM public.audit_progress);

-- Add some variety to audit dates
UPDATE public.audits 
SET date = CURRENT_DATE - (FLOOR(RANDOM() * 30) || ' days')::interval
WHERE id IN (SELECT id FROM public.audits ORDER BY RANDOM() LIMIT 5);

-- Create some audit tasks for the audits
INSERT INTO public.audit_tasks (audit_id, task_name, task_type, status, notes, findings, severity, recommendation)
SELECT 
    a.id,
    'Review Access Controls',
    'control_testing',
    CASE 
        WHEN a.status = 'Completed' THEN 'completed'
        WHEN a.status = 'In Progress' THEN 'in_progress'
        ELSE 'not_started'
    END,
    'Review user access controls and permissions',
    CASE 
        WHEN a.status = 'Completed' THEN 'Access controls are properly implemented'
        WHEN a.status = 'In Progress' THEN 'Currently reviewing access control documentation'
        ELSE 'Task not yet started'
    END,
    CASE 
        WHEN a.status = 'Completed' THEN 'low'
        WHEN a.status = 'In Progress' THEN 'medium'
        ELSE 'low'
    END,
    'Continue monitoring access control implementation'
FROM public.audits a;

INSERT INTO public.audit_tasks (audit_id, task_name, task_type, status, notes, findings, severity, recommendation)
SELECT 
    a.id,
    'Document Review',
    'document_review',
    CASE 
        WHEN a.status = 'Completed' THEN 'completed'
        WHEN a.status = 'In Progress' THEN 'in_progress'
        ELSE 'not_started'
    END,
    'Review security policies and procedures',
    CASE 
        WHEN a.status = 'Completed' THEN 'All required documentation reviewed'
        WHEN a.status = 'In Progress' THEN 'Reviewing policy documentation'
        ELSE 'Documentation review pending'
    END,
    'medium',
    'Ensure all policies are up to date'
FROM public.audits a;

-- Add some completed tasks for completed audits
INSERT INTO public.audit_tasks (audit_id, task_name, task_type, status, notes, findings, severity, recommendation)
SELECT 
    a.id,
    'Security Testing',
    'control_testing',
    'completed',
    'Performed security testing on critical systems',
    'Security controls are functioning properly',
    'low',
    'Continue regular security testing'
FROM public.audits a
WHERE a.status = 'Completed';

COMMENT ON TABLE public.audits IS 'Main audits table containing audit information and status';
COMMENT ON TABLE public.system_alerts IS 'System alerts and notifications for security, system, and compliance issues';
COMMENT ON TABLE public.audit_progress IS 'Progress tracking for individual audits';
COMMENT ON TABLE public.audit_metrics IS 'Metrics and analytics data for audits';
COMMENT ON TABLE public.audit_tasks IS 'Individual tasks within audits';
COMMENT ON TABLE public.audit_findings IS 'Findings discovered during audit tasks';
COMMENT ON TABLE public.audit_evidence IS 'Evidence files and documentation for audit tasks';
