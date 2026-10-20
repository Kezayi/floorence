import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { ADMIN_PREFIX } from './adminRoutes';

/** RUM Core Web Vitals (Norme AAA P2/P6) — envoi groupé, non bloquant, à la fermeture de page. */
type Payload = { name: string; value: number; rating: string; network: string; device: string; route: string };

export function getNetwork(): string {
  const c = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return c?.effectiveType ?? 'unknown';
}

export function initWebVitals() {
  if (typeof window === 'undefined' || location.pathname.startsWith(ADMIN_PREFIX)) return;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  const queue = new Map<string, Payload>();
  const device = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
  const push = (m: Metric) => {
    queue.set(m.name, {
      name: m.name, value: m.value, rating: m.rating,
      network: getNetwork(), device, route: location.pathname,
    });
  };
  const flush = () => {
    if (!queue.size) return;
    const body = JSON.stringify({ p_metrics: [...queue.values()] });
    queue.clear();
    fetch(`${url}/rest/v1/rpc/record_web_vitals`, {
      method: 'POST', keepalive: true, body,
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    }).catch(() => {});
  };

  onLCP(push); onINP(push); onCLS(push); onFCP(push); onTTFB(push);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
}
