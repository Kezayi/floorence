import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Cross, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { UpcomingEvent } from "@/hooks/useUpcomingEvents";

interface UpcomingEventsProps {
  type: "funerals" | "gatherings";
  title: string;
  events: UpcomingEvent[];
  loading: boolean;
}

const UpcomingEvents = ({ type, title, events, loading }: UpcomingEventsProps) => {
  const SectionIcon = type === "funerals" ? Cross : Flame;

  const getEventTypeLabel = (eventType: string) => {
    const t = eventType.toLowerCase();
    switch (t) {
      case "veillee": return "Veillée";
      case "inhumation": return "Inhumation";
      case "commemoration":
      case "recueillement": return "Recueillement";
      case "anniversary": return "Anniversaire";
      default: return eventType;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="p-2 bg-secondary rounded-sm">
            <SectionIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
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
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div className={`p-2 rounded-sm ${type === "funerals" ? "bg-foreground/5" : "bg-accent"}`}>
          <SectionIcon className={`w-5 h-5 ${type === "funerals" ? "text-foreground" : "text-accent-foreground"}`} />
        </div>
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground font-sans py-4 text-center">
          Aucun événement à venir.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/memorial/${event.memorial?.slug}`}
              className="block p-4 bg-secondary/30 rounded-sm hover:bg-secondary/60 transition-all duration-300 border border-transparent hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {event.memorial?.first_name} {event.memorial?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    {getEventTypeLabel(event.event_type)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-medium bg-background px-2 py-1 rounded-sm flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {format(new Date(event.event_date), "d MMM", { locale: fr })}
                  </span>
                </div>
              </div>
              
              {event.location && (
                <p className="text-xs text-muted-foreground font-sans mt-3 flex items-center gap-1.5 pt-2 border-t border-border/50">
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
