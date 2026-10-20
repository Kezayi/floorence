import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Seuils Norme AAA (Pilier 2) — P75 RUM. */
export const VITAL_THRESHOLDS: Record<string, { good: number; poor: number; unit: string; label: string }> = {
  LCP: { good: 2500, poor: 4000, unit: 'ms', label: 'Affichage principal (LCP)' },
  INP: { good: 200, poor: 500, unit: 'ms', label: 'Réactivité (INP)' },
  CLS: { good: 0.1, poor: 0.25, unit: '', label: 'Stabilité visuelle (CLS)' },
  FCP: { good: 1800, poor: 3000, unit: 'ms', label: 'Premier affichage (FCP)' },
  TTFB: { good: 800, poor: 1800, unit: 'ms', label: 'Réponse serveur (TTFB)' },
};

export function rateVital(metric: string, v: number): 'good' | 'needs' | 'poor' {
  const t = VITAL_THRESHOLDS[metric];
  if (!t) return 'needs';
  return v <= t.good ? 'good' : v <= t.poor ? 'needs' : 'poor';
}

const NETWORKS = [
  { id: 'all', label: 'Tous réseaux' },
  { id: 'slow', label: '3G / 2G' },
  { id: 'fast', label: '4G / Wi-Fi' },
  { id: 'unknown', label: 'Non déterminé (iOS…)' },
];

const RATING_STYLE = {
  good: 'text-primary border-primary/40',
  needs: 'text-accent-foreground border-accent',
  poor: 'text-destructive border-destructive/50',
};
const RATING_LABEL = { good: 'Conforme', needs: 'À améliorer', poor: 'Hors seuil' };

const WebVitalsPanel = () => {
  const [network, setNetwork] = useState('slow');
  const [days, setDays] = useState(7);
  const { data, isLoading, error } = useQuery({
    queryKey: ['web-vitals', network, days],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_web_vitals_summary', { p_days: days, p_network: network });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="mt-8">
      <CardHeader className="gap-3">
        <CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5 text-primary" /> Performance réelle (Core Web Vitals)</CardTitle>
        <p className="text-sm text-muted-foreground">Percentile 75 mesuré chez les visiteurs du site public. Le réseau n'est connu que sur Android/Chrome.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtre réseau">
          {NETWORKS.map((n) => (
            <button key={n.id} onClick={() => setNetwork(n.id)} aria-pressed={network === n.id}
              className={cn('px-3 py-1.5 rounded-full border text-xs transition-colors',
                network === n.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
              {n.label}
            </button>
          ))}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Période"
            className="ml-auto px-2 py-1.5 rounded-md border border-border bg-background text-xs">
            <option value={1}>24 h</option><option value={7}>7 jours</option><option value={30}>30 jours</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-28 bg-muted rounded animate-pulse" />)}</div>
        ) : error ? (
          <p className="text-sm text-destructive">Mesures indisponibles.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(VITAL_THRESHOLDS).map(([metric, t]) => {
              const row = data?.find((d) => d.metric === metric);
              const r = row ? rateVital(metric, row.p75) : null;
              return (
                <div key={metric} className={cn('rounded-lg border p-4', r ? RATING_STYLE[r] : 'border-border')}>
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                  <p className="text-2xl font-semibold mt-1 text-foreground">
                    {row ? (t.unit ? `${Math.round(row.p75)} ms` : row.p75.toFixed(3)) : '—'}
                  </p>
                  <p className="text-xs mt-1">
                    {row ? `${RATING_LABEL[r!]} · ${row.samples} mesures` : 'Aucune mesure'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Seuil : {t.unit ? `${t.good} ms` : t.good}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebVitalsPanel;
