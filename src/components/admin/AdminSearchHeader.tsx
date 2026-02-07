import { useState, useCallback } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

/* ------------------------------------------------------------------ */
/*  Social group options (aligned with relationCategoryUtils)          */
/* ------------------------------------------------------------------ */
export const SOCIAL_GROUP_OPTIONS = [
  { value: 'all', label: 'Tous les groupes' },
  { value: 'Famille directe', label: 'Famille directe' },
  { value: 'Famille élargie', label: 'Famille élargie' },
  { value: 'Alliés', label: 'Alliés' },
  { value: 'Socio cœur (Amis)', label: 'Socio cœur (Amis)' },
  { value: 'Autres', label: 'Autres' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'real', label: 'Réel' },
  { value: 'demo', label: 'Démo' },
] as const;

export const ACTION_TYPE_OPTIONS = [
  { value: 'all', label: 'Toutes les actions' },
  { value: 'users', label: 'Gestion utilisateurs' },
  { value: 'settings', label: 'Paramètres & prix' },
  { value: 'add_role', label: 'Ajout de rôle' },
  { value: 'remove_role', label: 'Retrait de rôle' },
  { value: 'ban_user', label: 'Blocage' },
  { value: 'unban_user', label: 'Déblocage' },
  { value: 'update_setting', label: 'Modification paramètre' },
  { value: 'guestbook_post_hidden', label: 'Hommage masqué' },
  { value: 'guestbook_post_restored', label: 'Hommage restauré' },
  { value: 'guestbook_post_updated', label: 'Hommage modifié' },
  { value: 'guestbook_post_deleted', label: 'Hommage supprimé' },
  { value: 'memorial_merged', label: 'Fusion mémorial' },
  { value: 'memorial_updated', label: 'Mémorial modifié' },
  { value: 'memorial_deleted', label: 'Mémorial supprimé' },
] as const;

/* ------------------------------------------------------------------ */
/*  Filter configuration — each page picks which filters to show      */
/* ------------------------------------------------------------------ */
export interface AdminSearchFilters {
  search: string;
  debouncedSearch: string;
  socialGroup: string;
  status: string;
  actionType: string;
  dateFrom: string;
  dateTo: string;
}

export interface AdminSearchHeaderProps {
  /** Placeholder for the search input */
  placeholder?: string;
  /** Which optional filters to show */
  showSocialGroup?: boolean;
  showStatus?: boolean;
  showActionType?: boolean;
  showDateRange?: boolean;
  /** Current filter values */
  filters: AdminSearchFilters;
  /** Called whenever a filter changes — parent controls state */
  onChange: (filters: AdminSearchFilters) => void;
}

/** Default / initial filter state */
export const defaultFilters: AdminSearchFilters = {
  search: '',
  debouncedSearch: '',
  socialGroup: 'all',
  status: 'all',
  actionType: 'all',
  dateFrom: '',
  dateTo: '',
};

/* ------------------------------------------------------------------ */
/*  Hook: useAdminFilters — manages filter state + debounce           */
/* ------------------------------------------------------------------ */
export function useAdminFilters() {
  const [filters, setFilters] = useState<AdminSearchFilters>(defaultFilters);
  const debouncedSearch = useDebounce(filters.search, 300);

  // Keep debounced value in sync
  const currentFilters: AdminSearchFilters = {
    ...filters,
    debouncedSearch,
  };

  const updateFilter = useCallback(
    <K extends keyof AdminSearchFilters>(key: K, value: AdminSearchFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.socialGroup !== 'all' ||
    filters.status !== 'all' ||
    filters.actionType !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  return { filters: currentFilters, updateFilter, resetFilters, hasActiveFilters };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const AdminSearchHeader = ({
  placeholder = 'Rechercher…',
  showSocialGroup = false,
  showStatus = false,
  showActionType = false,
  showDateRange = false,
  filters,
  onChange,
}: AdminSearchHeaderProps) => {
  const update = <K extends keyof AdminSearchFilters>(key: K, value: AdminSearchFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    (showSocialGroup && filters.socialGroup !== 'all') ||
    (showStatus && filters.status !== 'all') ||
    (showActionType && filters.actionType !== 'all') ||
    (showDateRange && (filters.dateFrom !== '' || filters.dateTo !== ''));

  const activeCount = [
    filters.search !== '',
    showSocialGroup && filters.socialGroup !== 'all',
    showStatus && filters.status !== 'all',
    showActionType && filters.actionType !== 'all',
    showDateRange && filters.dateFrom !== '',
    showDateRange && filters.dateTo !== '',
  ].filter(Boolean).length;

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6 space-y-3">
      {/* Row 1: Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="pl-10 pr-10"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => update('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Row 2: Contextual filters */}
      {(showSocialGroup || showStatus || showActionType || showDateRange) && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wide">Filtres</span>
          </div>

          {showSocialGroup && (
            <Select value={filters.socialGroup} onValueChange={(v) => update('socialGroup', v)}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_GROUP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))
                }
              </SelectContent>
            </Select>
          )}

          {showStatus && (
            <Select value={filters.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))
                }
              </SelectContent>
            </Select>
          )}

          {showActionType && (
            <Select value={filters.actionType} onValueChange={(v) => update('actionType', v)}>
              <SelectTrigger className="w-[220px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))
                }
              </SelectContent>
            </Select>
          )}

          {showDateRange && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => update('dateFrom', e.target.value)}
                className="h-9 w-[140px] text-xs"
                placeholder="Du"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => update('dateTo', e.target.value)}
                className="h-9 w-[140px] text-xs"
                placeholder="Au"
              />
            </div>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={() =>
                onChange({
                  ...filters,
                  search: '',
                  socialGroup: 'all',
                  status: 'all',
                  actionType: 'all',
                  dateFrom: '',
                  dateTo: '',
                })
              }
            >
              <X className="w-3 h-3" />
              Réinitialiser
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSearchHeader;
