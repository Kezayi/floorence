import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Cross, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { UpcomingEvent } from "@/hooks/useUpcomingEvents";

interface UpcomingEventsProps {
  type: "funerals" | "gatherings";
  title: string;
  events: UpcomingEvent[];
  loading: boolean;
}

const EVENTS_PER_PAGE = 3;

const UpcomingEvents = ({ type, title, events, loading }: UpcomingEventsProps) => {
  const SectionIcon = type === "funerals" ? Cross : Flame;
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE);
  const paginatedEvents = events.slice(page * EVENTS_PER_PAGE, (page + 1) * EVENTS_PER_PAGE);

  const getEventTypeLabel = (eventType: string) => {
    if (eventType === "Programme des obsèques") return "Programme des obsèques";
    if (eventType === "Recueillement") return "Recueillement";
    const t = eventType.toLowerCase();
    if (["veillee", "inhumation", "wake", "burial"].includes(t)) return "Programme des obsèques";
    return "Recueillement";
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
        {events.length > 0 && (
          <span className="text-xs text-muted-foreground font-sans ml-auto">
            {events.length} événement{events.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground font-sans py-4 text-center">
          Aucun événement à venir.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedEvents.map((event) => (
              <Link
                key={event.id}
                to={event.memorial?.share_token ? `/m/${event.memorial.share_token}` : `/memorial/${event.memorial?.slug}`}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground font-sans">
                {page * EVENTS_PER_PAGE + 1}–{Math.min((page + 1) * EVENTS_PER_PAGE, events.length)} sur {events.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-7 w-7 p-0"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-sans px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="h-7 w-7 p-0"
                  aria-label="Suivant"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UpcomingEvents;
