import { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from "react";
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
  refetchMemorials: () => Promise<void>;
}

const MemorialsContext = createContext<MemorialsContextType | undefined>(undefined);

export const MemorialsProvider = ({ children }: { children: ReactNode }) => {
  const [memorials, setMemorials] = useState<ExtendedSearchableMemorial[]>([]);
  const [memorialStats, setMemorialStats] = useState<Record<string, { postCount: number; candles: number; flowers: number }>>({});
  const [loading, setLoading] = useState(true);

  // Fetch guestbook stats for all memorials
  const fetchGuestbookStats = useCallback(async (memorialIds: string[]) => {
    if (memorialIds.length === 0) return {};
    
    try {
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
    } catch (err) {
      console.error('Error fetching guestbook stats:', err);
      return {};
    }
  }, []);

  // Fetch memorials from database
  const fetchMemorials = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memorials')
        .select('*')
        .eq('is_published', true)
        .eq('is_active', true)
        .is('merged_into', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memorials:', error);
        setMemorials([]);
        return;
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

      setMemorials(memorialsFromDb);

      // Fetch stats for all memorials
      if (memorialsFromDb.length > 0) {
        const stats = await fetchGuestbookStats(memorialsFromDb.map(m => m.id));
        setMemorialStats(stats);
      }
    } catch (err) {
      console.error('Error fetching memorials:', err);
      setMemorials([]);
    } finally {
      setLoading(false);
    }
  }, [fetchGuestbookStats]);

  useEffect(() => {
    fetchMemorials();
  }, [fetchMemorials]);

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

  return (
    <MemorialsContext.Provider value={{ memorials, memorialCards, loading, refetchMemorials: fetchMemorials }}>
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
