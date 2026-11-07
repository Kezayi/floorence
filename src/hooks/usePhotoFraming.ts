import { useContext } from "react";
import { QueryClient, QueryClientContext, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_FRAMING, PHOTO_FRAMING_KEY, validateFraming, type PhotoFramingSetting } from "@/lib/photoFraming";

export const PHOTO_FRAMING_QUERY = ["photo-framing"] as const;
// Repli hors fournisseur (tests isolés de <Photo>) : aucune requête lancée.
const isolatedClient = new QueryClient();

export const usePhotoFraming = () => {
  const client = useContext(QueryClientContext);
  return useQuery(
    {
      queryKey: PHOTO_FRAMING_QUERY,
      enabled: !!client,
      staleTime: 5 * 60_000,
      queryFn: async (): Promise<PhotoFramingSetting> => {
        const { data } = await supabase.from("system_settings").select("value").eq("key", PHOTO_FRAMING_KEY).maybeSingle();
        const v = validateFraming(data?.value);
        return v.ok ? v.value : DEFAULT_FRAMING;
      },
    },
    client ?? isolatedClient,
  );
};
