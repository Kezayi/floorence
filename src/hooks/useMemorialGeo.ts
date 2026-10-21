import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_GEO, normalizeGeo, type GeoLands } from "@/lib/geoLands";

export const GEO_COLUMNS = "origin_country, origin_locality, residence_country, residence_locality, burial_country, burial_locality, burial_status";
export const memorialGeoKey = (id: string) => ["memorial-geo", id] as const;

/** GEO-01: reads the three lands of a memorial under existing RLS (published or owner/admin). */
export const useMemorialGeo = (memorialId?: string) =>
  useQuery<GeoLands>({
    queryKey: memorialGeoKey(memorialId || ""),
    enabled: !!memorialId && /^[0-9a-f-]{36}$/i.test(memorialId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("memorials").select(GEO_COLUMNS).eq("id", memorialId!).maybeSingle();
      if (error || !data) return EMPTY_GEO;
      return normalizeGeo(data);
    },
  });
