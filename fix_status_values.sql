-- Fix Status Values Script
-- This script fixes any existing data that has incorrect status values

-- Update audit_progress table to use correct status values
UPDATE public.audit_progress 
SET status = CASE 
    WHEN status = 'In Progress' THEN 'in_progress'
    WHEN status = 'Completed' THEN 'completed'
    WHEN status = 'Not Started' THEN 'not_started'
    ELSE status
END
WHERE status IN ('In Progress', 'Completed', 'Not Started');

-- Update audit_tasks table to use correct status values
UPDATE public.audit_tasks 
SET status = CASE 
    WHEN status = 'In Progress' THEN 'in_progress'
    WHEN status = 'Completed' THEN 'completed'
    WHEN status = 'Not Started' THEN 'not_started'
    ELSE status
END
WHERE status IN ('In Progress', 'Completed', 'Not Started');

-- Update audit_findings table to use correct status values
UPDATE public.audit_findings 
SET status = CASE 
    WHEN status = 'In Progress' THEN 'in_progress'
    WHEN status = 'Completed' THEN 'completed'
    WHEN status = 'Not Started' THEN 'not_started'
    ELSE status
END
WHERE status IN ('In Progress', 'Completed', 'Not Started');

-- Verify the updates
SELECT 'audit_progress' as table_name, status, COUNT(*) as count 
FROM public.audit_progress 
GROUP BY status
UNION ALL
SELECT 'audit_tasks' as table_name, status, COUNT(*) as count 
FROM public.audit_tasks 
GROUP BY status
UNION ALL
SELECT 'audit_findings' as table_name, status, COUNT(*) as count 
FROM public.audit_findings 
GROUP BY status
ORDER BY table_name, status;
