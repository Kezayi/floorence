import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MemorialEvent {
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
  };
}

interface UpcomingEventsProps {
  type: "funerals" | "gatherings";
  title: string;
}

const UpcomingEvents = ({ type, title }: UpcomingEventsProps) => {
  const [events, setEvents] = useState<MemorialEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        
        // Define event types based on the type prop
        const eventTypes = type === "funerals" 
          ? ["veillee", "inhumation"] 
          : ["commemoration"];

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
              slug
            )
          `)
          .gte("event_date", today)
          .in("event_type", eventTypes)
          .eq("is_public", true)
          .order("event_date", { ascending: true })
          .limit(5);

        if (error) throw error;

        const formattedEvents = (data || []).map((event: any) => ({
          ...event,
          memorial: event.memorials,
        }));

        setEvents(formattedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [type]);

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case "veillee":
        return "Veillée";
      case "inhumation":
        return "Inhumation";
      case "commemoration":
        return "Recueillement";
      default:
        return eventType;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 bg-secondary/50 rounded-sm space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground font-sans py-4">
          Aucun événement à venir.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/memorial/${event.memorial?.slug}`}
              className="block p-3 bg-secondary/50 rounded-sm hover:bg-secondary transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {event.memorial?.first_name} {event.memorial?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    {getEventTypeLabel(event.event_type)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-sans whitespace-nowrap flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(event.event_date), "d MMM", { locale: fr })}
                </span>
              </div>
              
              {event.location && (
                <p className="text-xs text-muted-foreground font-sans mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingEvents;
