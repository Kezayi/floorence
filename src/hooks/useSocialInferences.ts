import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DetailLien {
  categorie: string;
  defunt: string;
  lien: string;
  slug: string;
}

export interface SocialInference {
  userId: string;
  authorName: string;
  totalMemorials: number;
  detailLiens: DetailLien[];
  connexionsSuggerees: string[];
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

const parseRow = (row: Record<string, unknown>): SocialInference => ({
  userId: (row.user_id as string) || "",
  authorName: (row.author_name as string) || "",
  totalMemorials: Number(row.total_memorials) || 0,
  detailLiens: Array.isArray(row.detail_liens)
    ? (row.detail_liens as DetailLien[])
    : [],
  connexionsSuggerees: Array.isArray(row.connexions_suggerees)
    ? (row.connexions_suggerees as string[])
    : [],
});

/** Fetch all social inferences from the view */
export const useSocialInferences = () => {
  return useQuery<SocialInference[]>({
    queryKey: ["social-inferences"],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_social_inferences")
        .select("*");

      if (error) {
        console.error("Error fetching social inferences:", error);
        return [];
      }

      return (data || []).map(parseRow);
    },
  });
};

/** Fetch a single user's social inference by user_id */
export const useSocialInferenceByUser = (userId: string | undefined) => {
  return useQuery<SocialInference | null>({
    queryKey: ["social-inference", userId],
    ...CACHE_CONFIG,
    enabled: !!userId && userId !== "anonymous",
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("v_social_inferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      return parseRow(data);
    },
  });
};
