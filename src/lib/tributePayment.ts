import { supabase } from "@/integrations/supabase/client";

export type PaymentRequest = { reference: string };

export async function paymentError(error: unknown, fallback: string): Promise<Error> {
  if (error && typeof error === "object" && "context" in error && error.context instanceof Response) {
    const body = await error.context.clone().json().catch(() => null);
    if (typeof body?.error === "string") return new Error(body.error);
  }
  return new Error(error instanceof Error ? error.message : fallback);
}

/** Status checks never initiate a debit. Only the server's final success unlocks the receipt. */
export async function checkTributePayment(reference: string): Promise<"success" | "pending" | "failed"> {
  const { data, error } = await supabase.functions.invoke("ebilling", {
    body: { action: "check-status", reference },
  });
  if (error) throw await paymentError(error, "Vérification du paiement impossible");
  if (data?.error) throw new Error(data.error);
  if (data?.success === true && data?.status === "success") return "success";
  return data?.status === "failed" ? "failed" : "pending";
}