import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UpcomingEvent {
  id: string;
  event_type: string;
  event_date: string;
  location: string | null;
  description: string | null;
  memorial_id: string;
  memorial?: {
    first_name: string;
    last_name: string;
    slug: string;
    share_token: string | null;
  };
}

interface UpcomingEventsData {
  funerals: UpcomingEvent[];
  gatherings: UpcomingEvent[];
}

const FUNERAL_TYPES = ["Programme des obsèques", "veillee", "inhumation", "VEILLEE", "INHUMATION", "WAKE", "BURIAL"];
const GATHERING_TYPES = ["Recueillement", "commemoration", "COMMEMORATION", "anniversary", "ANNIVERSARY", "recueillement", "RECUEILLEMENT", "GATHERING"];

/**
 * Single query that fetches ALL upcoming events and splits them by type.
 * Replaces two separate queries from UpcomingEvents components.
 */
export const useUpcomingEvents = () => {
  return useQuery<UpcomingEventsData>({
    queryKey: ['upcoming-events-all'],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const allTypes = [...FUNERAL_TYPES, ...GATHERING_TYPES];

      const { data, error } = await supabase
        .from("memorial_events")
        .select(`
          id,
          event_type,
          event_date,
          location,
          description,
          memorial_id,
          memorials!memorial_events_memorial_id_fkey (
            first_name,
            last_name,
            slug,
            share_token
          )
        `)
        .gte("event_date", now)
        .in("event_type", allTypes)
        .eq("is_public", true)
        .order("event_date", { ascending: true })
        .limit(10);

      if (error) throw error;

      const events = (data || []).map((event: any) => ({
        ...event,
        memorial: event.memorials,
      })) as UpcomingEvent[];

      const funeralTypesLower = new Set(FUNERAL_TYPES.map(t => t.toLowerCase()));

      return {
        funerals: events.filter(e => funeralTypesLower.has(e.event_type.toLowerCase())).slice(0, 5),
        gatherings: events.filter(e => !funeralTypesLower.has(e.event_type.toLowerCase())).slice(0, 5),
      };
    },
  });
};
