
-- ==========================================
-- FIX: Audit Trigger Return Value (CRITICAL)
-- The previous version returned NULL on DELETE, which cancelled the operation.
-- This fixed version returns OLD for DELETEs, allowing rows to be wiped.
-- ==========================================

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, 
            CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
            auth.uid());
    -- PostgreSQL BEFORE triggers must return OLD to allow DELETE to proceed
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No need to drop/recreate triggers since we updated the function they call.
-- But we reload the schema cache just in case.
NOTIFY pgrst, 'reload schema';
