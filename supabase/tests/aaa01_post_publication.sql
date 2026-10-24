-- Run ONLY against an isolated disposable PostgreSQL database containing the current schema.
-- Never run fixtures against the shared Cloud database. All rows below are synthetic.
BEGIN;
CREATE FUNCTION public.aaa01_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
CREATE FUNCTION public.aaa01_denied(statement text,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege OR invalid_authorization_specification THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL: %',label;
END $$;
INSERT INTO public.user_roles(user_id,role) VALUES('00000000-0000-4000-8000-000000000001','admin');
INSERT INTO public.memorials(id,slug,first_name,last_name,created_by,is_published) VALUES
 ('00000000-0000-4000-8000-000000000010','isolated-fixture','Test','Memorial','00000000-0000-4000-8000-000000000002',true);
INSERT INTO public.guestbook_posts(id,memorial_id,user_id,author_name,relation_category,content,is_hidden,candle_count,payment_reference) VALUES
 ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','Test','friend','Free tribute',false,0,NULL),
 ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','Test','friend','Paid tribute',true,100,'LOCAL-ONLY'),
 ('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','Test','friend','Restore-before-payment',true,1,'LOCAL-ONLY-2');
INSERT INTO public.payment_transactions(id,user_id,memorial_id,amount,payment_type,ebilling_reference) VALUES
 ('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000010',70000,'cierge','LOCAL-ONLY'),
 ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000010',700,'cierge','LOCAL-ONLY-2');
SET LOCAL ROLE anon;
SELECT public.aaa01_assert((SELECT count(*)=1 FROM public.get_public_guestbook_posts()),'free immediately visible, paid posts invisible');
SELECT public.aaa01_denied($q$SELECT public.report_guestbook_post('00000000-0000-4000-8000-000000000020','dignite',NULL)$q$,'anonymous report denied');
SELECT public.aaa01_denied('SELECT * FROM public.guestbook_reports','anonymous reports read denied');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
SELECT public.report_guestbook_post('00000000-0000-4000-8000-000000000020','dignite','Test report');
SELECT public.aaa01_assert((SELECT NOT is_hidden AND NOT editorial_hidden FROM public.guestbook_posts WHERE id='00000000-0000-4000-8000-000000000020'),'third-party report does not mask');
SELECT public.aaa01_assert((public.report_guestbook_post('00000000-0000-4000-8000-000000000020','autre',NULL)->>'duplicate')::boolean,'duplicate active report idempotent');
SELECT public.aaa01_assert((SELECT count(*)=1 FROM public.guestbook_reports),'one active report per account and post');
SELECT public.aaa01_denied('SELECT public.list_guestbook_reports()','non-admin queue denied');
SELECT public.aaa01_denied($q$SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000020','hide','test',NULL)$q$,'unverified family/third-party mask denied');
SELECT public.aaa01_denied($q$INSERT INTO public.guestbook_reports(post_id,reporter_id,reason) VALUES('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000004','dignite')$q$,'direct forged report insert denied');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
SELECT public.aaa01_assert((SELECT count(*)=0 FROM public.guestbook_reports),'other account reports confidential');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
SELECT public.aaa01_denied($q$SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000020','hide','test',NULL)$q$,'technical creator is not verified family authority');
SELECT public.aaa01_denied($q$UPDATE public.guestbook_posts SET editorial_hidden=true WHERE id='00000000-0000-4000-8000-000000000020'$q$,'owner cannot forge editorial status');
SELECT public.aaa01_denied($q$UPDATE public.guestbook_posts SET is_hidden=false WHERE id='00000000-0000-4000-8000-000000000021'$q$,'owner cannot bypass financial visibility');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT public.aaa01_assert((public.list_guestbook_reports()->>'pending')::integer=1,'admin queue pending count');
SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000020','maintain',NULL,(SELECT id FROM public.guestbook_reports LIMIT 1));
SELECT public.aaa01_assert((SELECT status='closed' AND decision='maintain' FROM public.guestbook_reports),'admin maintain closes report');
SELECT public.aaa01_assert((SELECT count(*)=1 FROM public.get_public_guestbook_posts()),'maintain preserves free visibility');
SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000021','hide','Dignity',NULL);
SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000022','hide','Dignity',NULL);
SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000022','restore',NULL,NULL);
SELECT public.aaa01_assert((SELECT is_hidden AND NOT editorial_hidden FROM public.guestbook_posts WHERE id='00000000-0000-4000-8000-000000000022'),'editorial restore does not unlock unpaid tribute');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
SELECT public.fulfill_payment_success('00000000-0000-4000-8000-000000000030','LOCAL-ONLY');
SELECT public.aaa01_assert((SELECT NOT is_hidden AND editorial_hidden AND candle_count=100 FROM public.guestbook_posts WHERE id='00000000-0000-4000-8000-000000000021'),'late fulfillment preserves editorial mask and quantity');
SELECT public.aaa01_assert((SELECT status='success' AND amount=70000 FROM public.payment_transactions WHERE id='00000000-0000-4000-8000-000000000030'),'financial success preserved under mask');
SELECT public.aaa01_assert((public.fulfill_payment_success('00000000-0000-4000-8000-000000000030','LOCAL-ONLY')->>'claimed')::boolean=false,'payment fulfillment remains idempotent');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT public.aaa01_assert((SELECT count(*)=1 FROM public.get_public_guestbook_posts()),'public RPC excludes editorial mask even for admin');
SELECT public.aaa01_assert((SELECT count(*)=1 FROM public.public_guestbook),'public view excludes editorial mask even for admin');
SELECT public.aaa01_assert((SELECT total_memorials=1 AND jsonb_array_length(detail_liens)=1 FROM public.v_social_inferences),'social projection excludes hidden rows');
SELECT public.aaa01_assert((SELECT post_count=1 AND total_candles=0 FROM public.get_memorial_gesture_stats(ARRAY['00000000-0000-4000-8000-000000000010'::uuid])),'public gesture aggregates exclude hidden paid content');
SELECT public.aaa01_assert((SELECT count=1 FROM public.get_memorial_social_stats('00000000-0000-4000-8000-000000000010')),'public social counts exclude hidden content');
SELECT public.aaa01_assert((SELECT count(*)=1 FROM public.get_public_guestbook_posts_consolidated('00000000-0000-4000-8000-000000000010')),'consolidated public RPC excludes hidden content');
SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000021','restore',NULL,NULL);
SELECT public.aaa01_assert((SELECT count(*)=2 FROM public.get_public_guestbook_posts()),'paid and editor-restored tribute visible');
SELECT public.moderate_tribute_editorial('00000000-0000-4000-8000-000000000020','trash','Test trash',NULL);
SELECT public.aaa01_assert((SELECT deleted_at IS NOT NULL AND NOT is_hidden AND editorial_hidden FROM public.guestbook_posts WHERE id='00000000-0000-4000-8000-000000000020'),'soft delete preserves financial state');
SELECT public.aaa01_assert((SELECT count(*)>=6 FROM public.audit_logs WHERE action_type LIKE 'guestbook_editorial_%'),'decisions audited transactionally');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT public.aaa01_assert((SELECT count(*)=1 FROM public.guestbook_posts),'RLS public access excludes editorial mask unpaid and trash');
RESET ROLE;
ROLLBACK;