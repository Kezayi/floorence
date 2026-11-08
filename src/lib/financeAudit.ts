import { pvitIssue, type PaymentIssue } from "../../supabase/functions/_shared/pvitErrors";

export type AuditTx = {
  status: string | null;
  operator: string | null;
  payment_type?: string | null;
  date_libreville: string | null;
  last_api_response?: string | null;
};

/** Translated PVit cause of a failed/expired transaction; null when nothing is recorded. */
export function failureIssue(tx: Pick<AuditTx, "status" | "last_api_response">): PaymentIssue | null {
  if (tx.status !== "failed" && tx.status !== "timeout") return null;
  if (!tx.last_api_response) return null;
  const issue = pvitIssue(tx.last_api_response);
  return issue.code === "UNKNOWN" ? null : issue;
}

export function filterAudit<T extends AuditTx>(rows: T[], operator: string, type: string): T[] {
  return rows.filter(t =>
    (operator === "all" || t.operator === operator) &&
    (type === "all" || t.payment_type === type));
}

export type OperatorHealth = {
  operator: string; total: number; success: number; rate: number | null;
  consecutiveFailures: number; outage: boolean;
};

/** Per-operator health; outage = last 3+ attempts all failed/expired. */
export function operatorHealth(rows: AuditTx[], operator: string): OperatorHealth {
  const own = rows.filter(t => t.operator === operator && t.status !== "pending")
    .sort((a, b) => new Date(b.date_libreville ?? 0).getTime() - new Date(a.date_libreville ?? 0).getTime());
  const success = own.filter(t => t.status === "success").length;
  let consecutiveFailures = 0;
  for (const t of own) { if (t.status === "success") break; consecutiveFailures++; }
  return {
    operator, total: own.length, success,
    rate: own.length ? Math.round((success / own.length) * 100) : null,
    consecutiveFailures, outage: consecutiveFailures >= 3,
  };
}
