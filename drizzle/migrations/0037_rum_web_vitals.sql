CREATE TABLE public.rum_web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric text NOT NULL CHECK (metric IN ('LCP','INP','CLS','FCP','TTFB')),
  value double precision NOT NULL CHECK (value >= 0 AND value < 600000),
  rating text,
  network text NOT NULL DEFAULT 'unknown',
  device text NOT NULL DEFAULT 'unknown',
  route text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rum_web_vitals TO service_role;
ALTER TABLE public.rum_web_vitals ENABLE ROW LEVEL SECURITY;
CREATE INDEX rum_web_vitals_created_idx ON public.rum_web_vitals (created_at DESC, metric);

CREATE OR REPLACE FUNCTION public.record_web_vitals(p_metrics jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m jsonb; n int := 0;
BEGIN
  IF jsonb_typeof(p_metrics) <> 'array' THEN RETURN; END IF;
  FOR m IN SELECT * FROM jsonb_array_elements(p_metrics) LOOP
    n := n + 1; EXIT WHEN n > 10;
    BEGIN
      INSERT INTO public.rum_web_vitals(metric, value, rating, network, device, route)
      VALUES (
        m->>'name', (m->>'value')::double precision,
        left(m->>'rating', 20),
        CASE WHEN m->>'network' IN ('slow-2g','2g','3g','4g') THEN m->>'network' ELSE 'unknown' END,
        CASE WHEN m->>'device' IN ('mobile','desktop') THEN m->>'device' ELSE 'unknown' END,
        left(regexp_replace(coalesce(m->>'route','/'), '[?#].*$', ''), 120));
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
  IF random() < 0.01 THEN
    DELETE FROM public.rum_web_vitals WHERE created_at < now() - interval '30 days';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_web_vitals(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_web_vitals(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_web_vitals_summary(p_days int DEFAULT 7, p_network text DEFAULT 'all')
RETURNS TABLE(metric text, p75 double precision, samples bigint, good_ratio double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_or_moderator(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.metric,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY r.value),
    count(*),
    avg(CASE WHEN r.rating = 'good' THEN 1.0 ELSE 0.0 END)::double precision
  FROM public.rum_web_vitals r
  WHERE r.created_at >= now() - make_interval(days => greatest(1, least(p_days, 30)))
    AND (p_network = 'all'
      OR (p_network = 'slow' AND r.network IN ('slow-2g','2g','3g'))
      OR (p_network = 'fast' AND r.network = '4g')
      OR (p_network = 'unknown' AND r.network = 'unknown'))
  GROUP BY r.metric;
END $$;
REVOKE ALL ON FUNCTION public.get_web_vitals_summary(int, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_web_vitals_summary(int, text) TO authenticated;