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
  legacySlug?: string | null;
  isDemo?: boolean;
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
  isDemo?: boolean;
}

interface MemorialsContextType {
  memorials: ExtendedSearchableMemorial[];
  memorialCards: MemorialCardData[];
  loading: boolean;
  isRefetching: boolean;
  refetchMemorials: () => Promise<void>;
  /** Lazy-loaded guestbook posts (only fetched when needed, e.g. Search page) */
  guestbookByMemorial: Record<string, GuestbookMessage[]>;
  guestbookLoading: boolean;
}

const MemorialsContext = createContext<MemorialsContextType | undefined>(undefined);

// Fetch guestbook stats for all memorials using RPC function
const fetchGuestbookStats = async (memorialIds: string[]): Promise<Record<string, { postCount: number; candles: number; flowers: number }>> => {
  if (memorialIds.length === 0) return {};
  
  const { data, error } = await supabase
    .rpc('get_memorial_gesture_stats', { p_memorial_ids: memorialIds });

  if (error) {
    console.error('Error fetching guestbook stats:', error);
    return {};
  }

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
    .from('profiles_public')
    .select('user_id, display_name')
    .in('user_id', creatorIds);

  if (error) {
    console.error('Error fetching creator profiles:', error);
    return {};
  }

  const profiles: Record<string, string> = {};
  (data || []).forEach((profile: ProfileData) => {
    if (profile.user_id) {
      profiles[profile.user_id] = profile.display_name || 'Créateur';
    }
  });

  return profiles;
};

// Fetch memorials from database — WITHOUT guestbook posts (deferred)
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
  const memorialIds = (data || []).map(m => m.id);

  // Fetch creator profiles AND stats in parallel (was sequential before)
  const [creatorProfiles, stats] = await Promise.all([
    fetchCreatorProfiles(creatorIds),
    fetchGuestbookStats(memorialIds),
  ]);

  // Filter out base64 data from photos
  const getValidPhotos = (m: typeof data[0]): string[] => {
    const allPhotos = (m.photos && m.photos.length > 0) ? m.photos : (m.photo_url ? [m.photo_url] : []);
    return allPhotos.filter((p: string) => p && !p.startsWith('data:'));
  };

  const memorialsFromDb: ExtendedSearchableMemorial[] = (data || []).map(m => ({
    id: m.id,
    slug: m.slug,
    legacySlug: m.legacy_slug || null,
    name: `${m.first_name} ${m.last_name}`,
    birthDate: formatDateFrench(m.birth_date),
    deathDate: formatDateFrench(m.death_date),
    bio: m.biography || "",
    photos: getValidPhotos(m),
    author: {
      id: m.created_by,
      name: creatorProfiles[m.created_by] || "Créateur",
      relation: m.creator_relation || "Créateur de l'espace",
    },
    // Guestbook messages are now lazy-loaded separately
    guestbookMessages: [],
    type: getMemorialType(formatDateFrench(m.death_date)),
    createdBy: m.created_by,
    donationEnabled: m.donation_enabled,
    funeralDate: m.funeral_date,
    funeralLocation: m.funeral_location,
    defaultPhotoIndex: m.default_photo_index || 0,
    isDemo: m.is_demo || false,
  }));

  return { memorials: memorialsFromDb, stats, creatorProfiles };
};

// Separate fetcher for guestbook posts (lazy, only for Search page)
const fetchAllGuestbookPosts = async (): Promise<Record<string, GuestbookMessage[]>> => {
  const { data, error } = await supabase
    .rpc('get_public_guestbook_posts');

  if (error) {
    console.error('Error fetching guestbook posts:', error);
    return {};
  }

  const postsByMemorial: Record<string, GuestbookMessage[]> = {};
  (data || []).forEach((post: { id: string; memorial_id: string; author_name: string; relation_category: string; content: string; candle_count: number; flower_count: number }) => {
    if (!postsByMemorial[post.memorial_id]) {
      postsByMemorial[post.memorial_id] = [];
    }
    postsByMemorial[post.memorial_id].push({
      id: post.id,
      authorName: post.author_name,
      relationCategory: post.relation_category,
      content: post.content,
      candleCount: post.candle_count,
      flowerCount: post.flower_count,
    });
  });

  return postsByMemorial;
};

export const MemorialsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  
  // Core memorials data (fast: no guestbook posts)
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['memorials-list'],
    queryFn: fetchMemorialsData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Lazy guestbook posts — only fetched when accessed (Search page will trigger via useGuestbookPosts)
  const { data: guestbookByMemorial = {}, isLoading: guestbookLoading } = useQuery({
    queryKey: ['guestbook-posts-all'],
    queryFn: fetchAllGuestbookPosts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Don't fetch eagerly — only when something subscribes
    enabled: false,
  });

  const memorials = data?.memorials ?? [];
  const memorialStats = data?.stats ?? {};

  // Compute memorial cards with real stats from DB
  const memorialCards = useMemo<MemorialCardData[]>(() => 
    memorials.map(m => {
      const stats = memorialStats[m.id] || { postCount: 0, candles: 0, flowers: 0 };
      const safeIndex = (m.defaultPhotoIndex ?? 0) < m.photos.length ? (m.defaultPhotoIndex ?? 0) : 0;
      
      return {
        id: m.id,
        slug: m.slug,
        name: m.name,
        birthDate: m.birthDate,
        deathDate: m.deathDate,
        photoUrl: m.photos[safeIndex] || "",
        ripCount: stats.postCount,
        candleCount: stats.candles,
        flowerCount: stats.flowers,
        type: m.type,
        isDemo: m.isDemo || false,
      };
    }),
  [memorials, memorialStats]);

  const refetchMemorials = async () => {
    await refetch();
  };

  return (
    <MemorialsContext.Provider value={{ 
      memorials, 
      memorialCards, 
      loading: isLoading, 
      isRefetching, 
      refetchMemorials,
      guestbookByMemorial,
      guestbookLoading,
    }}>
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

/**
 * Hook to lazy-load guestbook posts for search.
 * Triggers the deferred query and merges posts into memorials.
 */
export const useMemorialsWithGuestbook = () => {
  const context = useMemorials();
  const queryClient = useQueryClient();

  // Enable the lazy query on first use
  const { data: guestbookByMemorial = {}, isLoading: guestbookLoading } = useQuery({
    queryKey: ['guestbook-posts-all'],
    queryFn: fetchAllGuestbookPosts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Merge guestbook posts into memorials
  const memorialsWithGuestbook = useMemo(() => 
    context.memorials.map(m => ({
      ...m,
      guestbookMessages: guestbookByMemorial[m.id] || [],
    })),
  [context.memorials, guestbookByMemorial]);

  return {
    ...context,
    memorials: memorialsWithGuestbook,
    guestbookLoading,
  };
};
