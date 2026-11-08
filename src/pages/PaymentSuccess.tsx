import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertTriangle, Home, ArrowLeft, Loader2, Receipt } from "lucide-react";
import { openPaymentReceipt } from "@/lib/paymentReceipt";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkTributePaymentDetail } from "@/lib/tributePayment";

interface PendingTribute {
  content: string;
  relationCategory: string;
  photos: string[];
  candleCount: number;
  flowerCount: number;
  reference: string;
  memorialId?: string;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get("reference");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memorialId, setMemorialId] = useState<string | null>(null);

  useEffect(() => {
    const publishPendingTribute = async () => {
      setIsPublished(false); setError(null);
      if (!reference) { setError("Référence absente : aucun paiement ne peut être confirmé."); return; }
      const pendingTributeData = sessionStorage.getItem('pendingTribute');
      try {
        if (pendingTributeData) {
          const pendingTribute: PendingTribute = JSON.parse(pendingTributeData);
          if (pendingTribute.reference !== reference) throw new Error("La référence ne correspond pas à cet hommage.");
          if (pendingTribute.memorialId) setMemorialId(pendingTribute.memorialId);
        }
        setIsPublishing(true);
        const { status, message } = await checkTributePaymentDetail(reference);
        if (status !== "success") throw new Error(message);
        // Fulfillment is server-owned; never create a second tribute from browser storage.
        setIsPublished(true);
        sessionStorage.removeItem('pendingTribute');
      } catch (err) {
        setError(err instanceof Error ? err.message : "Vérification du paiement impossible.");
      } finally {
        setIsPublishing(false);
      }
    };

    publishPendingTribute();
  }, [reference]);

  return (
    <div className="min-h-screen flex flex-col bg-memorial-dark text-memorial-dark-foreground">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-8">
          {isPublishing ? (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
              </div>
              <div className="space-y-4">
                <h1 className="font-serif text-3xl font-medium">
                  Vérification du paiement…
                </h1>
                <p className="text-memorial-dark-muted text-lg">
                  Nous vérifions la confirmation de l’opérateur. Veuillez patienter.
                </p>
              </div>
            </>
          ) : error ? (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-12 h-12 text-destructive" />
                </div>
              </div>
              <div className="space-y-4">
                <h1 className="font-serif text-3xl font-medium">
                  Paiement non confirmé
                </h1>
                <p className="text-memorial-dark-muted text-lg">
                  {error}
                </p>
                <p className="text-sm text-memorial-dark-muted">
                  Aucun succès ne sera annoncé avant confirmation de l'opérateur.
                </p>
                {reference && (
                  <p className="text-sm text-memorial-dark-muted">
                    Référence: <span className="font-mono">{reference}</span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="font-serif text-3xl font-medium">
                  {isPublished ? "Paiement confirmé" : "Vérification du paiement"}
                </h1>
                <p className="text-memorial-dark-muted text-lg">
                  {isPublished 
                    ? "Votre paiement est confirmé. Merci pour votre contribution."
                    : "En attente de confirmation du paiement."
                  }
                </p>
                {reference && (
                  <p className="text-sm text-memorial-dark-muted">
                    Référence: <span className="font-mono">{reference}</span>
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isPublished && reference && (
              <Button variant="outline" className="gap-2" onClick={async () => {
                const { data } = await supabase.from('payment_transactions')
                  .select('amount, created_at, deceased_name_snapshot, payment_type, candle_count, flower_count')
                  .eq('ebilling_reference', reference).eq('status', 'success').maybeSingle();
                if (!data) { toast.error("Reçu indisponible pour cette référence."); return; }
                const parts = [data.candle_count ? `Cierge ×${data.candle_count}` : '', data.flower_count ? `Fleur ×${data.flower_count}` : ''].filter(Boolean);
                const ok = openPaymentReceipt({ reference, amount: data.amount, date: data.created_at,
                  deceased: data.deceased_name_snapshot, typeLabel: parts.join(' + ') || (data.payment_type === 'memorial' ? 'Mémorial' : null) });
                if (!ok) toast.error("Autorisez les fenêtres pour afficher le reçu.");
              }}>
                <Receipt className="w-4 h-4" />
                Télécharger le reçu
              </Button>
            )}
            {memorialId && isPublished && (
              <Button
                asChild
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to={`/memorial/${memorialId}`}>
                  <ArrowLeft className="w-4 h-4" />
                  Retour au mémorial
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="gap-2 bg-transparent border-memorial-dark-muted/30 text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
            >
              <Link to="/">
                <Home className="w-4 h-4" />
                Accueil
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="gap-2"
            >
              <Link to="/recherche">
                Continuer à explorer
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
