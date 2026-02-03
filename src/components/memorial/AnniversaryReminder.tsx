import { useMemo } from "react";
import { Calendar, Bell } from "lucide-react";
import { parseISO, isValid, differenceInDays, differenceInYears, format, addYears, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

interface AnniversaryReminderProps {
  deathDate: string;
  name: string;
}

const AnniversaryReminder = ({ deathDate, name }: AnniversaryReminderProps) => {
  const anniversaryInfo = useMemo(() => {
    try {
      const death = parseISO(deathDate);
      if (!isValid(death)) return null;

      const today = new Date();
      const yearsSinceDeath = differenceInYears(today, death);
      
      // Calculate next anniversary
      let nextAnniversary = addYears(death, yearsSinceDeath);
      if (isBefore(nextAnniversary, today)) {
        nextAnniversary = addYears(death, yearsSinceDeath + 1);
      }
      
      const daysUntil = differenceInDays(nextAnniversary, today);
      const upcomingYear = differenceInYears(nextAnniversary, death);

      return {
        yearsSinceDeath,
        nextAnniversary,
        daysUntil,
        upcomingYear,
        isToday: daysUntil === 0,
        isThisWeek: daysUntil > 0 && daysUntil <= 7,
        isThisMonth: daysUntil > 7 && daysUntil <= 30,
      };
    } catch {
      return null;
    }
  }, [deathDate]);

  if (!anniversaryInfo) return null;

  const { yearsSinceDeath, nextAnniversary, daysUntil, upcomingYear, isToday, isThisWeek, isThisMonth } = anniversaryInfo;

  // Determine urgency styling
  let bgClass = "bg-secondary";
  let borderClass = "border-border";
  let iconClass = "text-muted-foreground";
  
  if (isToday) {
    bgClass = "bg-primary/10";
    borderClass = "border-primary";
    iconClass = "text-primary";
  } else if (isThisWeek) {
    bgClass = "bg-amber-50 dark:bg-amber-900/20";
    borderClass = "border-amber-500";
    iconClass = "text-amber-500";
  } else if (isThisMonth) {
    bgClass = "bg-blue-50 dark:bg-blue-900/20";
    borderClass = "border-blue-400";
    iconClass = "text-blue-400";
  }

  const ordinalSuffix = (n: number): string => {
    if (n === 1) return "er";
    return "ème";
  };

  return (
    <div className={`p-4 rounded-sm border ${bgClass} ${borderClass}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${isToday ? "bg-primary/20" : "bg-muted"}`}>
          {isToday ? (
            <Bell className={`w-5 h-5 ${iconClass}`} />
          ) : (
            <Calendar className={`w-5 h-5 ${iconClass}`} />
          )}
        </div>
        
        <div className="flex-1">
          {isToday ? (
            <>
              <p className="font-sans font-medium text-primary">
                Aujourd'hui, nous commémorons le {upcomingYear}{ordinalSuffix(upcomingYear)} anniversaire du décès de {name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Une pensée pour tous ses proches en ce jour de souvenir.
              </p>
            </>
          ) : (
            <>
              <p className="font-sans font-medium">
                {upcomingYear}{ordinalSuffix(upcomingYear)} anniversaire du décès
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {daysUntil === 1 
                  ? "Demain"
                  : `Dans ${daysUntil} jours`
                } — {format(nextAnniversary, "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </>
          )}
          
          {yearsSinceDeath > 0 && !isToday && (
            <p className="text-xs text-muted-foreground mt-2 font-sans">
              Décédé(e) le {format(parseISO(deathDate), "d MMMM yyyy", { locale: fr })} ({yearsSinceDeath} an{yearsSinceDeath > 1 ? "s" : ""})
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnniversaryReminder;
