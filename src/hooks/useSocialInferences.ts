import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialInference {
  userId: string;
  authorName: string;
  rolesSummary: string;
  totalMemorialsLinked: number;
  detailedInferences: Array<{
    memorial_slug: string;
    role: string;
  }>;
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

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

      return (data || []).map((row) => ({
        userId: row.user_id || "",
        authorName: row.author_name || "",
        rolesSummary: row.roles_summary || "",
        totalMemorialsLinked: Number(row.total_memorials_linked) || 0,
        detailedInferences: Array.isArray(row.detailed_inferences)
          ? (row.detailed_inferences as Array<{ memorial_slug: string; role: string }>)
          : [],
      }));
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

      return {
        userId: data.user_id || "",
        authorName: data.author_name || "",
        rolesSummary: data.roles_summary || "",
        totalMemorialsLinked: Number(data.total_memorials_linked) || 0,
        detailedInferences: Array.isArray(data.detailed_inferences)
          ? (data.detailed_inferences as Array<{ memorial_slug: string; role: string }>)
          : [],
      };
    },
  });
};
