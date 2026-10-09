CREATE OR REPLACE FUNCTION public.mmc_block_revoke_active_merge()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'revoked' AND OLD.status = 'confirmed' AND EXISTS (
     SELECT 1 FROM memorials WHERE id = OLD.source_memorial_id AND merged_into = OLD.master_memorial_id) THEN
    RAISE EXCEPTION 'Révocation impossible : fusion active (dissocier d''abord)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_mmc_block_revoke_active_merge BEFORE UPDATE ON public.memorial_merge_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.mmc_block_revoke_active_merge();

CREATE OR REPLACE FUNCTION public.admin_merge_memorial(source_id uuid, master_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_src memorials; v_mst memorials; v_conf memorial_merge_confirmations;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  IF source_id IS NULL OR master_id IS NULL OR source_id = master_id THEN RAISE EXCEPTION 'Paire invalide ou auto-fusion'; END IF;
  PERFORM 1 FROM memorials WHERE id IN (source_id, master_id) ORDER BY id FOR UPDATE;
  SELECT * INTO v_src FROM memorials WHERE id = source_id;
  SELECT * INTO v_mst FROM memorials WHERE id = master_id;
  IF v_src.id IS NULL OR v_mst.id IS NULL THEN RAISE EXCEPTION 'Mémorial introuvable'; END IF;
  IF v_src.deleted_at IS NOT NULL OR v_mst.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Mémorial à la corbeille'; END IF;
  IF v_src.merged_into IS NOT NULL THEN RAISE EXCEPTION 'Source déjà associée'; END IF;
  IF v_mst.merged_into IS NOT NULL THEN RAISE EXCEPTION 'Master lui-même associé (chaîne interdite)'; END IF;
  IF EXISTS (SELECT 1 FROM memorials WHERE merged_into = source_id) THEN RAISE EXCEPTION 'Source est Master d''autres avis (chaîne interdite)'; END IF;
  SELECT * INTO v_conf FROM memorial_merge_confirmations
    WHERE source_memorial_id = source_id AND master_memorial_id = master_id AND status = 'confirmed' FOR UPDATE;
  IF v_conf.id IS NULL THEN RAISE EXCEPTION 'Aucune confirmation familiale valide pour cette paire'; END IF;
  IF v_conf.confirmed_by <> COALESCE(v_mst.heir_user_id, v_mst.created_by) THEN
    RAISE EXCEPTION 'Confirmateur non habilité pour ce Master'; END IF;
  UPDATE memorials SET merged_into = master_id WHERE id = source_id;
  INSERT INTO audit_logs(action_type, performed_by, performed_by_email, details)
  VALUES ('memorial_merged', v_uid, (SELECT email FROM auth.users WHERE id = v_uid),
          jsonb_build_object('source_id', source_id, 'master_id', master_id, 'confirmation_id', v_conf.id, 'confirmed_by', v_conf.confirmed_by));
  RETURN jsonb_build_object('success', true, 'source_id', source_id, 'master_id', master_id, 'confirmation_id', v_conf.id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_unmerge_memorial(source_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_master uuid; v_conf uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  SELECT merged_into INTO v_master FROM memorials WHERE id = source_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mémorial introuvable'; END IF;
  IF v_master IS NULL THEN RAISE EXCEPTION 'Avis non associé'; END IF;
  PERFORM 1 FROM memorials WHERE id = v_master FOR UPDATE;
  UPDATE memorials SET merged_into = NULL WHERE id = source_id;
  UPDATE memorial_merge_confirmations SET status = 'revoked', revoked_by = v_uid, revocation_reason = 'admin_unmerge'
    WHERE source_memorial_id = source_id AND master_memorial_id = v_master AND status = 'confirmed'
    RETURNING id INTO v_conf;
  INSERT INTO audit_logs(action_type, performed_by, performed_by_email, details)
  VALUES ('memorial_unmerged', v_uid, (SELECT email FROM auth.users WHERE id = v_uid),
          jsonb_build_object('source_id', source_id, 'master_id', v_master, 'confirmation_id', v_conf));
  RETURN jsonb_build_object('success', true, 'source_id', source_id, 'master_id', v_master, 'revoked_confirmation_id', v_conf);
END $$;

REVOKE ALL ON FUNCTION public.admin_merge_memorial(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unmerge_memorial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_merge_memorial(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unmerge_memorial(uuid) TO authenticated, service_role;