import {
  LayoutDashboard, Settings, MessageSquare, Users, BarChart3, Flower2, BookOpen,
  History, Activity, Brain, Sparkles, Route, Banknote, Trash2, type LucideIcon,
} from 'lucide-react';
import { ADMIN_PREFIX } from './adminRoutes';

export interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
  badgeKey?: 'suggestions';
}

export interface AdminNavPole {
  id: string;
  label: string;
  items: AdminNavItem[];
}

/** BO-01 — 4 pôles métier. Toutes les routes historiques restent présentes. */
export const ADMIN_NAV: AdminNavPole[] = [
  {
    id: 'operations',
    label: 'Opérations mémorielles',
    items: [
      { to: `${ADMIN_PREFIX}/memoriaux`, icon: Flower2, label: 'Mémoriaux & fusions' },
      { to: `${ADMIN_PREFIX}/moderation`, icon: MessageSquare, label: 'Modération des hommages' },
      { to: `${ADMIN_PREFIX}/corbeille`, icon: Trash2, label: 'Corbeille', adminOnly: true },
    ],
  },
  {
    id: 'relations',
    label: 'Relations & intelligence',
    items: [
      { to: `${ADMIN_PREFIX}/audit-suggestions`, icon: Sparkles, label: 'Suggestions relationnelles', adminOnly: true, badgeKey: 'suggestions' },
      { to: `${ADMIN_PREFIX}/pont-intermediaires`, icon: Route, label: 'Pont des Vivants', adminOnly: true },
      { to: `${ADMIN_PREFIX}/intelligence-sociale`, icon: Brain, label: 'Exploration RAGet', adminOnly: true },
    ],
  },
  {
    id: 'pilotage',
    label: 'Pilotage & finances',
    items: [
      { to: ADMIN_PREFIX, icon: LayoutDashboard, label: 'Tableau de bord', end: true },
      { to: `${ADMIN_PREFIX}/finances`, icon: Banknote, label: 'Transactions', adminOnly: true },
      { to: `${ADMIN_PREFIX}/statistiques`, icon: BarChart3, label: 'Statistiques d’activité' },
      { to: `${ADMIN_PREFIX}/analytics`, icon: Activity, label: 'Analyses par mémorial', adminOnly: true },
    ],
  },
  {
    id: 'gouvernance',
    label: 'Gouvernance',
    items: [
      { to: `${ADMIN_PREFIX}/utilisateurs`, icon: Users, label: 'Utilisateurs & rôles', adminOnly: true },
      { to: `${ADMIN_PREFIX}/modeles`, icon: BookOpen, label: 'Modèles de textes', adminOnly: true },
      { to: `${ADMIN_PREFIX}/parametres`, icon: Settings, label: 'Paramètres & tarifs', adminOnly: true },
      { to: `${ADMIN_PREFIX}/historique`, icon: History, label: 'Historique & sécurité', adminOnly: true },
    ],
  },
];

/** Résout pôle + entrée pour le fil d'Ariane (préfixe le plus long). */
export function resolveAdminCrumbs(pathname: string) {
  let best: { pole: AdminNavPole; item: AdminNavItem } | null = null;
  for (const pole of ADMIN_NAV) {
    for (const item of pole.items) {
      const match = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/');
      if (match && (!best || item.to.length > best.item.to.length)) best = { pole, item };
    }
  }
  if (!best) return null;
  const rest = pathname.slice(best.item.to.length).replace(/^\//, '');
  const sub = rest
    ? rest.startsWith('nouveau') ? 'Nouveau' : best.item.to.endsWith('/modeles') ? 'Édition' : 'Fiche'
    : null;
  return { ...best, sub };
}
