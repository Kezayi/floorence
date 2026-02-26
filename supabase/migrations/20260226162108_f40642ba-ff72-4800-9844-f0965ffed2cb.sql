
-- Supprimer la policy conflictuelle qui permet aux utilisateurs authentifiés d'insérer
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
