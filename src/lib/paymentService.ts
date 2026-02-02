import { supabase } from "@/integrations/supabase/client";

interface InitiatePaymentParams {
  amount: number;
  paymentType: string;
  memorialId?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentResponse {
  success: boolean;
  reference?: string;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
}

export const initiatePayment = async (params: InitiatePaymentParams): Promise<PaymentResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('initiate-payment', {
      body: params
    });

    if (error) {
      console.error('Payment initiation error:', error);
      return { success: false, error: error.message };
    }

    return data as PaymentResponse;
  } catch (error) {
    console.error('Payment service error:', error);
    return { success: false, error: 'Une erreur est survenue lors de l\'initiation du paiement' };
  }
};

export const checkPaymentStatus = async (reference: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('status')
      .eq('ebilling_reference', reference)
      .maybeSingle();

    if (error) {
      console.error('Error checking payment status:', error);
      return null;
    }

    return data?.status || null;
  } catch (error) {
    console.error('Payment status check error:', error);
    return null;
  }
};
