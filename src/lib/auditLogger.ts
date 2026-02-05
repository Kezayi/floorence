import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuditActionType =
  | 'memorial_updated'
  | 'memorial_deleted'
  | 'memorial_merged'
  | 'guestbook_post_updated'
  | 'guestbook_post_deleted'
  | 'guestbook_post_hidden'
  | 'guestbook_post_restored';

interface AuditLogDetails {
  memorial_id?: string;
  guestbook_post_id?: string;
  changes?: Record<string, { old: Json; new: Json }>;
  [key: string]: Json | undefined;
}

export async function logAuditAction(
  actionType: AuditActionType,
  performedBy: string,
  performedByEmail: string | null,
  details: AuditLogDetails,
  targetUserId?: string | null,
  targetUserEmail?: string | null
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert([{
      action_type: actionType,
      performed_by: performedBy,
      performed_by_email: performedByEmail,
      details: details as Json,
      target_user_id: targetUserId || null,
      target_user_email: targetUserEmail || null,
    }]);

    if (error) {
      console.error('Failed to log audit action:', error);
    }
  } catch (err) {
    console.error('Error logging audit action:', err);
  }
}
