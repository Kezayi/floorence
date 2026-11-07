import { supabase } from "@/integrations/supabase/client";
import { pvitIssue, paymentIssueText } from "../../supabase/functions/_shared/pvitErrors";

export type PaymentRequest = { reference: string };

export async function paymentError(error: unknown, fallback: string): Promise<Error> {
  if (error && typeof error === "object" && "context" in error && error.context instanceof Response) {
    const body = await error.context.clone().json().catch(() => null);
    if (body?.status_code !== undefined || body?.code !== undefined) return new Error(paymentIssueText(pvitIssue(body)));
    if (typeof body?.error === "string") return new Error(body.error);
    return new Error(error.context.status === 401 ? "Votre session a expiré. Reconnectez-vous pour vérifier votre paiement." : fallback);
  }
  return new Error(error instanceof Error && !/fetch|network|non-2xx|Functions/i.test(error.message) ? error.message : fallback);
}

export type PaymentStatusDetail = { status: "success" | "pending" | "failed"; message: string; code?: string };
export async function checkTributePaymentDetail(reference: string): Promise<PaymentStatusDetail> {
  const { data, error } = await supabase.functions.invoke("ebilling", { body: { action: "check-status", reference } });
  if (error) throw await paymentError(error, "La connexion ne permet pas de vérifier le paiement. Conservez sa référence ; ne relancez pas de débit.");
  if (data?.error) throw new Error(data.error);
  const status = data?.success === true && data?.status === "success" ? "success" : data?.status === "failed" ? "failed" : "pending";
  return { status, code: data?.error_code, message: data?.message || (status === "failed" ? "L’opérateur a refusé ce paiement sans préciser la cause. Conservez sa référence pour vérification." : "Paiement non confirmé. Ne relancez pas de débit ; vérifiez cette même référence.") };
}

/** Status checks never initiate a debit. Only the server's final success unlocks the receipt. */
export async function checkTributePayment(reference: string): Promise<"success" | "pending" | "failed"> {
  return (await checkTributePaymentDetail(reference)).status;
}