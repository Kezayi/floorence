import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchableMemorial } from "@/lib/searchWithRelations";
import { getMemorialType, formatDateFrench } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";

// Type for profile data
interface ProfileData {
  user_id: string;
  display_name: string | null;
}

interface GuestbookMessage {
  id: string;
  authorName: string;
  relationCategory: string;
  content: string;
  candleCount: number;
  flowerCount: number;
}

interface ExtendedSearchableMemorial extends SearchableMemorial {
  type: "RECENT" | "PAST";
  createdBy?: string;
  donationEnabled?: boolean;
  funeralDate?: string | null;
  funeralLocation?: string | null;
   defaultPhotoIndex?: number;
}

interface MemorialCardData {
  id: string;
  slug: string;
  name: string;
  birthDate: string;
  deathDate: string;
  photoUrl: string;
  ripCount: number;
  candleCount: number;
  flowerCount: number;
  type: "RECENT" | "PAST";
}

interface MemorialsContextType {
  memorials: ExtendedSearchableMemorial[];
  memorialCards: MemorialCardData[];
  loading: boolean;
  isRefetching: boolean;
  refetchMemorials: () => Promise<void>;
}

const MemorialsContext = createContext<MemorialsContextType | undefined>(undefined);

// Fetch guestbook stats for all memorials using RPC function (bypasses RLS for aggregation)
const fetchGuestbookStats = async (memorialIds: string[]): Promise<Record<string, { postCount: number; candles: number; flowers: number }>> => {
  if (memorialIds.length === 0) return {};
  
  const { data, error } = await supabase
    .rpc('get_memorial_gesture_stats', { p_memorial_ids: memorialIds });

  if (error) {
    console.error('Error fetching guestbook stats:', error);
    return {};
  }

  // Map RPC results to our stats format
  const stats: Record<string, { postCount: number; candles: number; flowers: number }> = {};
  (data || []).forEach((row: { memorial_id: string; post_count: number; total_candles: number; total_flowers: number }) => {
    stats[row.memorial_id] = {
      postCount: row.post_count,
      candles: row.total_candles,
      flowers: row.total_flowers,
    };
  });

  return stats;
};

// Fetch creator profiles
const fetchCreatorProfiles = async (creatorIds: string[]): Promise<Record<string, string>> => {
  if (creatorIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', creatorIds);

  if (error) {
    console.error('Error fetching creator profiles:', error);
    return {};
  }

  const profiles: Record<string, string> = {};
  (data || []).forEach((profile: ProfileData) => {
    profiles[profile.user_id] = profile.display_name || 'Créateur';
  });

  return profiles;
};

// Fetch memorials from database
const fetchMemorialsData = async (): Promise<{ memorials: ExtendedSearchableMemorial[]; stats: Record<string, { postCount: number; candles: number; flowers: number }>; creatorProfiles: Record<string, string> }> => {
  const { data, error } = await supabase
    .from('memorials')
    .select('*')
    .eq('is_published', true)
    .eq('is_active', true)
    .is('merged_into', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching memorials:', error);
    throw error;
  }

  // Get unique creator IDs
  const creatorIds = [...new Set((data || []).map(m => m.created_by))];
  
  // Fetch creator profiles
  const creatorProfiles = await fetchCreatorProfiles(creatorIds);

  const memorialsFromDb: ExtendedSearchableMemorial[] = (data || []).map(m => ({
    id: m.id,
    slug: m.slug,
    name: `${m.first_name} ${m.last_name}`,
    birthDate: formatDateFrench(m.birth_date),
    deathDate: formatDateFrench(m.death_date),
    bio: m.biography || "",
   photos: (m.photos && m.photos.length > 0) ? m.photos : (m.photo_url ? [m.photo_url] : []),
    author: {
      id: m.created_by,
      name: creatorProfiles[m.created_by] || "Créateur",
      relation: "Créateur de l'espace",
    },
    guestbookMessages: [],
    type: getMemorialType(formatDateFrench(m.death_date)),
    createdBy: m.created_by,
    donationEnabled: m.donation_enabled,
    funeralDate: m.funeral_date,
    funeralLocation: m.funeral_location,
   defaultPhotoIndex: m.default_photo_index || 0,
  }));

  // Fetch stats for all memorials
  const stats = memorialsFromDb.length > 0 
    ? await fetchGuestbookStats(memorialsFromDb.map(m => m.id))
    : {};

  return { memorials: memorialsFromDb, stats, creatorProfiles };
};

export const MemorialsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  
  // React Query with caching: staleTime = 2 min, refetch on window focus
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['memorials-list'],
    queryFn: fetchMemorialsData,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const memorials = data?.memorials ?? [];
  const memorialStats = data?.stats ?? {};

  // Compute memorial cards with real stats from DB
  const memorialCards = useMemo<MemorialCardData[]>(() => 
    memorials.map(m => {
      const stats = memorialStats[m.id] || { postCount: 0, candles: 0, flowers: 0 };
      
      return {
        id: m.id,
        slug: m.slug,
        name: m.name,
        birthDate: m.birthDate,
        deathDate: m.deathDate,
        photoUrl: m.photos[0] || "",
        ripCount: stats.postCount,
        candleCount: stats.candles,
        flowerCount: stats.flowers,
        type: m.type,
      };
    }),
  [memorials, memorialStats]);

  const refetchMemorials = async () => {
    await refetch();
  };

  return (
    <MemorialsContext.Provider value={{ memorials, memorialCards, loading: isLoading, isRefetching, refetchMemorials }}>
      {children}
    </MemorialsContext.Provider>
  );
};

export const useMemorials = () => {
  const context = useContext(MemorialsContext);
  if (context === undefined) {
    throw new Error("useMemorials must be used within a MemorialsProvider");
  }
  return context;
};
