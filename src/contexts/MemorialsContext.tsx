import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchableMemorial } from "@/lib/searchWithRelations";
import { getMemorialType, formatDateFrench } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";

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

// Fetch guestbook stats for all memorials
const fetchGuestbookStats = async (memorialIds: string[]): Promise<Record<string, { postCount: number; candles: number; flowers: number }>> => {
  if (memorialIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('guestbook_posts')
    .select('memorial_id, candle_count, flower_count')
    .in('memorial_id', memorialIds)
    .eq('is_hidden', false);

  if (error) {
    console.error('Error fetching guestbook stats:', error);
    return {};
  }

  // Aggregate stats per memorial
  const stats: Record<string, { postCount: number; candles: number; flowers: number }> = {};
  (data || []).forEach(post => {
    if (!stats[post.memorial_id]) {
      stats[post.memorial_id] = { postCount: 0, candles: 0, flowers: 0 };
    }
    stats[post.memorial_id].postCount += 1;
    stats[post.memorial_id].candles += post.candle_count || 0;
    stats[post.memorial_id].flowers += post.flower_count || 0;
  });

  return stats;
};

// Fetch memorials from database
const fetchMemorialsData = async (): Promise<{ memorials: ExtendedSearchableMemorial[]; stats: Record<string, { postCount: number; candles: number; flowers: number }> }> => {
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

  const memorialsFromDb: ExtendedSearchableMemorial[] = (data || []).map(m => ({
    id: m.id,
    slug: m.slug,
    name: `${m.first_name} ${m.last_name}`,
    birthDate: formatDateFrench(m.birth_date),
    deathDate: formatDateFrench(m.death_date),
    bio: m.biography || "",
    photos: m.photo_url ? [m.photo_url] : [],
    author: {
      id: m.created_by,
      name: "Créateur",
      relation: "Créateur de l'espace",
    },
    guestbookMessages: [],
    type: getMemorialType(formatDateFrench(m.death_date)),
    createdBy: m.created_by,
    donationEnabled: m.donation_enabled,
    funeralDate: m.funeral_date,
    funeralLocation: m.funeral_location,
  }));

  // Fetch stats for all memorials
  const stats = memorialsFromDb.length > 0 
    ? await fetchGuestbookStats(memorialsFromDb.map(m => m.id))
    : {};

  return { memorials: memorialsFromDb, stats };
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
