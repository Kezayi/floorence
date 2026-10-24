import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export const reportReasons = [
  ['injure_diffamation', 'Injure / diffamation'],
  ['usurpation_parente', 'Usurpation / parenté contestée'],
  ['publicite_inapproprie', 'Publicité / contenu inapproprié'],
  ['dignite', 'Atteinte à la dignité'],
  ['autre', 'Autre'],
] as const;
export type ReportReason = typeof reportReasons[number][0];
export type EditorialAction = 'maintain' | 'hide' | 'restore' | 'trash';

const queueSchema = z.object({
  pending: z.number(), total: z.number(), items: z.array(z.object({
    id: z.string().uuid(), post_id: z.string().uuid(), reason: z.string(),
    detail: z.string().nullable(), status: z.enum(['open', 'closed']),
    decision: z.string().nullable(), decision_reason: z.string().nullable(),
    created_at: z.string(), content: z.string(), author_name: z.string(),
    memorial_name: z.string(), editorial_hidden: z.boolean(), is_hidden: z.boolean(),
    deleted_at: z.string().nullable(), report_history: z.number(),
  })),
});
export type GuestbookReport = z.infer<typeof queueSchema>['items'][number];

// The generated Cloud client types are refreshed after schema activation.
// Validate new RPC payloads at the boundary; never pass unverified data to views.
const rpc = (name: 'report_guestbook_post' | 'list_guestbook_reports' | 'moderate_tribute_editorial', args: Record<string, string | number | null>) => supabase.rpc(name, args);

export async function reportTribute(postId: string, reason: ReportReason, detail: string) {
  const { data, error } = await rpc('report_guestbook_post', { p_post_id: postId, p_reason: reason, p_detail: detail.trim() || null });
  if (error) throw new Error(error.code === 'P0002' ? "Cet hommage n'est plus disponible." : error.code === '28000' || error.code === '42501' ? 'Connectez-vous pour signaler cet hommage.' : "Le signalement n'a pas pu être envoyé. Réessayez.");
  return z.object({ accepted: z.boolean(), duplicate: z.boolean(), conservatory_hidden: z.boolean() }).parse(data);
}

export async function listReports(status: 'open' | 'closed', offset: number) {
  const { data, error } = await rpc('list_guestbook_reports', { p_status: status, p_offset: offset });
  if (error) throw new Error('Impossible de charger les signalements.');
  return queueSchema.parse(data);
}

export async function decideTribute(postId: string, action: EditorialAction, reason?: string, reportId?: string) {
  const { error } = await rpc('moderate_tribute_editorial', { p_post_id: postId, p_action: action, p_reason: reason?.trim() || null, p_report_id: reportId || null });
  if (error) throw new Error(error.code === '40001' ? 'Ce signalement a déjà été traité. Actualisez la file.' : "La décision n'a pas pu être enregistrée. Vérifiez vos droits et réessayez.");
}