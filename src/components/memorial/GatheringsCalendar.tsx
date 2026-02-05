import { useState, useMemo } from "react";
import { Calendar, MapPin, Clock, Plus, Users } from "lucide-react";
import { format, parseISO, isValid, isFuture, isPast, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddEventDialog from "./AddEventDialog";

interface MemorialEvent {
  id: string;
  event_type: string;
  event_date: string;
  event_end_time?: string;
  location?: string;
  description?: string;
  is_public: boolean;
}

interface GatheringsCalendarProps {
  events: MemorialEvent[];
  memorialName: string;
  memorialId?: string;
  isOwner?: boolean;
  onAddEvent?: () => void;  
}

const eventTypeLabels: Record<string, string> = {
  WAKE: "Veillée",
  BURIAL: "Inhumation",
  COMMEMORATION: "Commémoration",
  ANNIVERSARY: "Anniversaire",
  GATHERING: "Recueillement",
};

const eventTypeColors: Record<string, string> = {
  WAKE: "bg-amber-500",
  BURIAL: "bg-stone-700",
  COMMEMORATION: "bg-violet-500",
  ANNIVERSARY: "bg-rose-500",
  GATHERING: "bg-emerald-500",
};

const GatheringsCalendar = ({ events, memorialName, memorialId, isOwner = false, onAddEvent }: GatheringsCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter gatherings and anniversaries (exclude WAKE, BURIAL for this tab)
  const gatheringEvents = useMemo(() => 
    events.filter(e => ['GATHERING', 'ANNIVERSARY', 'COMMEMORATION'].includes(e.event_type)),
    [events]
  );

  // Separate into upcoming and past
  const upcomingEvents = useMemo(() => 
    gatheringEvents
      .filter(e => {
        try {
          return isFuture(parseISO(e.event_date));
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()),
    [gatheringEvents]
  );

  const pastEvents = useMemo(() =>
    gatheringEvents
      .filter(e => {
        try {
          return isPast(parseISO(e.event_date));
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()),
    [gatheringEvents]
  );

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return gatheringEvents.filter(e => {
      try {
        return isSameDay(parseISO(e.event_date), day);
      } catch {
        return false;
      }
    });
  };

  // Events for selected date
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const formatEventDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return dateStr;
      return format(date, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="mb-2">Recueillements</h3>
          <p className="font-serif text-muted-foreground">
            Moments de commémoration et de souvenir pour {memorialName}
          </p>
        </div>
        
        {isOwner && memorialId && onAddEvent && (
          <AddEventDialog
            memorialId={memorialId}
            onEventAdded={onAddEvent}
            triggerButton={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Planifier
              </Button>
            }
          />
        )}
      </div>

      {/* Mini Calendar */}
      <div className="bg-secondary p-4 rounded-sm">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="font-sans font-medium capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground font-sans p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          
          {daysInMonth.map(day => {
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`
                  p-2 text-center text-sm font-sans rounded-sm transition-colors relative
                  ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                  ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/50" : ""}
                `}
              >
                {format(day, "d")}
                {hasEvents && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-green" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selectedDate && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-sans text-muted-foreground mb-3">
              {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </p>
            {selectedDayEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDayEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${eventTypeColors[event.event_type]}`} />
                    <span>{eventTypeLabels[event.event_type]}</span>
                    {event.location && (
                      <span className="text-muted-foreground">- {event.location}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun événement ce jour</p>
            )}
          </div>
        )}
      </div>

      {/* Upcoming events list */}
      {upcomingEvents.length > 0 && (
        <div>
          <h4 className="text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-green" />
            Prochains recueillements
          </h4>
          
          <div className="space-y-4">
            {upcomingEvents.map(event => (
              <div
                key={event.id}
                className="p-5 bg-secondary rounded-sm border-l-4 border-accent-green"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${eventTypeColors[event.event_type]}`} />
                  <span className="font-sans font-medium">{eventTypeLabels[event.event_type]}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-sans">{formatEventDate(event.event_date)}</span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="font-sans">{event.location}</span>
                    </div>
                  )}
                  
                  {event.description && (
                    <p className="text-muted-foreground font-serif mt-2 pt-2 border-t border-border">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past events */}
      {pastEvents.length > 0 && (
        <div>
          <h4 className="text-lg mb-4 text-muted-foreground">Recueillements passés</h4>
          
          <div className="space-y-3">
            {pastEvents.slice(0, 5).map(event => (
              <div
                key={event.id}
                className="p-4 bg-muted/50 rounded-sm opacity-70"
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm">{eventTypeLabels[event.event_type]}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(event.event_date), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
                {event.location && (
                  <span className="text-xs text-muted-foreground">{event.location}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {gatheringEvents.length === 0 && (
        <div className="text-center py-12 bg-secondary rounded-sm">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="mb-2">Aucun recueillement planifié</h4>
          <p className="text-sm text-muted-foreground font-sans">
            {isOwner 
              ? "Planifiez un moment de commémoration pour rassembler les proches."
              : "Aucun moment de recueillement n'est prévu pour l'instant."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default GatheringsCalendar;
