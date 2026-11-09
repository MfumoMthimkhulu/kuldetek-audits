-- Migration script to enhance the existing audit_tasks table for comprehensive fieldwork

-- Add new columns for task type, status, and fieldwork data
ALTER TABLE public.audit_tasks 
ADD COLUMN IF NOT EXISTS task_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS findings TEXT,
ADD COLUMN IF NOT EXISTS severity VARCHAR(10),
ADD COLUMN IF NOT EXISTS recommendation TEXT,
ADD COLUMN IF NOT EXISTS evidence TEXT[],
ADD COLUMN IF NOT EXISTS evidence_notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_tasks_status ON public.audit_tasks(status);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_type ON public.audit_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_plan_id ON public.audit_tasks(plan_id);

-- Add check constraints for data validation
ALTER TABLE public.audit_tasks 
ADD CONSTRAINT chk_task_type CHECK (task_type IN ('control_testing', 'document_review', 'interviews', 'observation', 'data_analysis')),
ADD CONSTRAINT chk_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
ADD CONSTRAINT chk_severity CHECK (severity IN ('low', 'medium', 'high'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_audit_tasks_updated_at 
    BEFORE UPDATE ON public.audit_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN public.audit_tasks.task_type IS 'Type of audit task: control_testing, document_review, interviews, observation, data_analysis';
COMMENT ON COLUMN public.audit_tasks.status IS 'Current status: not_started, in_progress, completed, blocked';
COMMENT ON COLUMN public.audit_tasks.notes IS 'Working papers and fieldwork notes';
COMMENT ON COLUMN public.audit_tasks.findings IS 'Documented findings and issues';
COMMENT ON COLUMN public.audit_tasks.severity IS 'Severity of findings: low, medium, high';
COMMENT ON COLUMN public.audit_tasks.recommendation IS 'Recommended corrective actions';
COMMENT ON COLUMN public.audit_tasks.evidence IS 'Array of evidence file URLs';
COMMENT ON COLUMN public.audit_tasks.evidence_notes IS 'Notes about collected evidence';

-- Optional: Create audit_evidence table for better evidence management
CREATE TABLE IF NOT EXISTS public.audit_evidence (
    id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    task_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID,
    CONSTRAINT audit_evidence_pkey PRIMARY KEY (id),
    CONSTRAINT fk_task_evidence FOREIGN KEY (task_id) REFERENCES audit_tasks(id) ON DELETE CASCADE
);

-- Optional: Create audit_findings table for better findings management
CREATE TABLE IF NOT EXISTS public.audit_findings (
    id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    task_id UUID NOT NULL,
    finding_text TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL,
    recommendation TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT audit_findings_pkey PRIMARY KEY (id),
    CONSTRAINT fk_task_findings FOREIGN KEY (task_id) REFERENCES audit_tasks(id) ON DELETE CASCADE,
    CONSTRAINT chk_finding_severity CHECK (severity IN ('low', 'medium', 'high')),
    CONSTRAINT chk_finding_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- Create trigger for audit_findings updated_at
CREATE TRIGGER update_audit_findings_updated_at 
    BEFORE UPDATE ON public.audit_findings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'audit_tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position; 