import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, CalendarDays, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'success', label: 'Succès' },
  { value: 'pending', label: 'En attente' },
  { value: 'failed', label: 'Échoué' },
  { value: 'timeout', label: 'Expiré' },
] as const;

interface FinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (r: DateRange | undefined) => void;
}

const FinanceFilters = ({
  searchQuery, onSearchChange,
  statusFilter, onStatusChange,
  dateRange, onDateRangeChange,
}: FinanceFiltersProps) => {
  const hasDateFilter = dateRange?.from || dateRange?.to;

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Nom du défunt, téléphone ou réf..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <Badge
            key={opt.value}
            variant={statusFilter === opt.value ? 'default' : 'outline'}
            className="cursor-pointer select-none transition-colors"
            onClick={() => onStatusChange(opt.value)}
          >
            {opt.label}
          </Badge>
        ))}
      </div>

      {/* Date range picker */}
      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", hasDateFilter && "border-primary text-primary")}>
              <CalendarDays className="w-4 h-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <span className="text-xs">
                    {format(dateRange.from, 'dd/MM', { locale: fr })} — {format(dateRange.to, 'dd/MM', { locale: fr })}
                  </span>
                ) : (
                  <span className="text-xs">Depuis {format(dateRange.from, 'dd/MM', { locale: fr })}</span>
                )
              ) : (
                <span className="text-xs">Période</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={fr}
              className={cn("p-3 pointer-events-auto")}
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
        {hasDateFilter && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDateRangeChange(undefined)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FinanceFilters;
