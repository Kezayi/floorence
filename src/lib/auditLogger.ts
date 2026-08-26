import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuditActionType =
  | 'memorial_updated'
  | 'memorial_deleted'
  | 'memorial_merged'
  | 'memorial_relation_created'
  | 'guestbook_post_updated'
  | 'guestbook_post_deleted'
  | 'guestbook_post_hidden'
  | 'guestbook_post_restored'
  | 'memorial_soft_deleted'
  | 'guestbook_post_soft_deleted'
  | 'trash_restored'
  | 'trash_purged';

interface AuditLogDetails {
  memorial_id?: string;
  guestbook_post_id?: string;
  changes?: Record<string, { old: Json; new: Json }>;
  [key: string]: Json | undefined;
}

/**
 * Log an audit action via the secure edge function (service_role bypass).
 * This ensures audit_logs are immutable from the client side.
 */
export async function logAuditAction(
  actionType: AuditActionType,
  _performedBy: string,
  _performedByEmail: string | null,
  details: AuditLogDetails,
  targetUserId?: string | null,
  targetUserEmail?: string | null
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('log-audit', {
      body: {
        action_type: actionType,
        details,
        target_user_id: targetUserId || null,
        target_user_email: targetUserEmail || null,
      },
    });

    if (error) {
      console.error('Failed to log audit action:', error);
    }
  } catch (err) {
    console.error('Error logging audit action:', err);
  }
}
