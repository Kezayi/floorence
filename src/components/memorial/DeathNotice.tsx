import { Calendar, MapPin, Clock, Heart } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

interface MemorialEvent {
  id: string;
  event_type: string;
  event_date: string;
  event_end_time?: string;
  location?: string;
  description?: string;
}

interface DeathNoticeProps {
  memorial: {
    name: string;
    birthDate: string;
    deathDate: string;
    bio: string;
    funeralDate?: string;
    funeralLocation?: string;
  };
  events?: MemorialEvent[];
}

const eventTypeLabels: Record<string, string> = {
  "Programme des obsèques": "Programme des obsèques",
  "Recueillement": "Recueillement",
  // Legacy support
  WAKE: "Programme des obsèques",
  BURIAL: "Programme des obsèques",
  COMMEMORATION: "Recueillement",
  ANNIVERSARY: "Recueillement",
  GATHERING: "Recueillement",
};

const eventTypeIcons: Record<string, string> = {
  "Programme des obsèques": "⚰️",
  "Recueillement": "🤝",
  WAKE: "⚰️",
  BURIAL: "⚰️",
  COMMEMORATION: "🤝",
  ANNIVERSARY: "🤝",
  GATHERING: "🤝",
};

const formatEventDate = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
  } catch {
    return dateStr;
  }
};

const DeathNotice = ({ memorial, events = [] }: DeathNoticeProps) => {
  // Filter Programme des obsèques events
  const funeralEvents = events.filter(e => 
    e.event_type === 'Programme des obsèques' || ['WAKE', 'BURIAL', 'COMMEMORATION'].includes(e.event_type)
  );

  return (
    <div className="space-y-8">
      {/* Avis de décès principal */}
      <div className="bg-secondary p-6 md:p-8 rounded-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Heart className="w-4 h-4" />
          <span className="font-sans">Avis de décès</span>
        </div>
        
        <h3 className="text-xl md:text-2xl mb-4">
          Nous avons la douleur de vous faire part du décès de
        </h3>
        
        <p className="text-2xl md:text-3xl font-serif mb-4">
          {memorial.name}
        </p>
        
        <p className="text-muted-foreground font-sans mb-6">
          {memorial.birthDate} — {memorial.deathDate}
        </p>
        
        {memorial.bio && (
          <p className="font-serif text-foreground/80 leading-relaxed">
            {memorial.bio}
          </p>
        )}
      </div>

      {/* Programme des obsèques */}
      {(funeralEvents.length > 0 || memorial.funeralDate) && (
        <div>
          <h3 className="mb-6">Programme des obsèques</h3>
          
          <div className="space-y-4">
            {funeralEvents.length > 0 ? (
              funeralEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-6 bg-secondary rounded-sm border-l-4 border-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-sm font-sans">
                      <span>{eventTypeIcons[event.event_type]}</span>
                      {eventTypeLabels[event.event_type]}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-sans">{formatEventDate(event.event_date)}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-start gap-2 text-foreground">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="font-sans">{event.location}</span>
                      </div>
                    )}
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground font-serif mt-3 pt-3 border-t border-border">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : memorial.funeralDate && (
              /* Fallback: use memorial.funeralDate if no events */
              <div className="p-6 bg-secondary rounded-sm border-l-4 border-primary">
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-sm font-sans">
                    <span>⚰️</span>
                    Inhumation
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-sans">{memorial.funeralDate}</span>
                  </div>
                  
                  {memorial.funeralLocation && (
                    <div className="flex items-start gap-2 text-foreground">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="font-sans">{memorial.funeralLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message de condoléances */}
      <div className="text-center py-6 border-t border-b border-border">
        <p className="font-serif text-muted-foreground italic">
          La famille vous remercie pour votre soutien et vos pensées en ce moment difficile.
        </p>
      </div>
    </div>
  );
};

export default DeathNotice;
