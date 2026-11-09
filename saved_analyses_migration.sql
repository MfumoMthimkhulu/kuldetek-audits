-- Saved Analyses Migration
-- Creates table for storing saved audit analyses

-- Create saved_analyses table
CREATE TABLE IF NOT EXISTS public.saved_analyses (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL,
    audit_title TEXT,
    analysis_type VARCHAR(50) NOT NULL,
    summary TEXT,
    analysis_data JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT saved_analyses_pkey PRIMARY KEY (id),
    CONSTRAINT saved_analyses_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.audits (id) ON DELETE CASCADE,
    CONSTRAINT saved_analyses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
    CONSTRAINT chk_analysis_type CHECK (analysis_type IN ('summary', 'riskAssessment', 'controlEffectiveness', 'complianceCheck', 'recommendations', 'trendAnalysis', 'vulnerabilityAssessment'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_analyses_audit_id ON public.saved_analyses(audit_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_created_by ON public.saved_analyses(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_analysis_type ON public.saved_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_created_at ON public.saved_analyses(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_saved_analyses_updated_at 
    BEFORE UPDATE ON public.saved_analyses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample saved analyses
INSERT INTO public.saved_analyses (audit_id, audit_title, analysis_type, summary, analysis_data, created_by) 
SELECT 
    a.id,
    a.title,
    CASE 
        WHEN a.category = 'Security' THEN 'vulnerabilityAssessment'
        WHEN a.category = 'Compliance' THEN 'complianceCheck'
        WHEN a.category = 'Performance' THEN 'trendAnalysis'
        ELSE 'summary'
    END,
    CASE 
        WHEN a.category = 'Security' THEN 'Comprehensive security vulnerability assessment completed with 15 findings identified'
        WHEN a.category = 'Compliance' THEN 'Compliance check completed with 3 minor gaps identified and remediation plan provided'
        WHEN a.category = 'Performance' THEN 'Performance trend analysis shows 12% improvement in key metrics over the last quarter'
        ELSE 'General audit analysis completed with key findings and recommendations'
    END,
    CASE 
        WHEN a.category = 'Security' THEN '{"findings": 15, "critical": 2, "high": 5, "medium": 6, "low": 2, "recommendations": 8}'
        WHEN a.category = 'Compliance' THEN '{"compliance_score": 87, "gaps": 3, "remediation_plan": "provided", "next_review": "2024-03-15"}'
        WHEN a.category = 'Performance' THEN '{"improvement": 12, "metrics_tracked": 8, "trend": "positive", "forecast": "continued_growth"}'
        ELSE '{"status": "completed", "key_insights": 5, "recommendations": 3}'
    END,
    '00000000-0000-0000-0000-000000000000'::uuid -- Placeholder user ID
FROM public.audits a
WHERE a.status = 'Completed'
LIMIT 5;

-- Add comments for documentation
COMMENT ON TABLE public.saved_analyses IS 'Stores saved audit analyses for future reference and sharing';
COMMENT ON COLUMN public.saved_analyses.analysis_type IS 'Type of analysis: summary, riskAssessment, controlEffectiveness, complianceCheck, recommendations, trendAnalysis, vulnerabilityAssessment';
COMMENT ON COLUMN public.saved_analyses.analysis_data IS 'JSON data containing the detailed analysis results';
COMMENT ON COLUMN public.saved_analyses.summary IS 'Brief summary of the analysis findings';
