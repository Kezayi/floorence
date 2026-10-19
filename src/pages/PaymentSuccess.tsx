import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Home, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      // Check for pending tribute in sessionStorage
      const pendingTributeData = sessionStorage.getItem('pendingTribute');
      
      if (!pendingTributeData) {
        // No pending tribute, just show success
        setIsPublished(true);
        return;
      }

      try {
        const pendingTribute: PendingTribute = JSON.parse(pendingTributeData);
        
        // Store the memorial ID for the return button
        if (pendingTribute.memorialId) {
          setMemorialId(pendingTribute.memorialId);
        }
        
        // Verify the reference matches
        if (reference && pendingTribute.reference !== reference) {
          // Reference mismatch — silently ignore
          sessionStorage.removeItem('pendingTribute');
          setIsPublished(true);
          return;
        }

        setIsPublishing(true);

        // Call the edge function to publish the tribute
        const { data, error: publishError } = await supabase.functions.invoke('publish-tribute', {
          body: {
            paymentReference: pendingTribute.reference,
            memorialId: pendingTribute.memorialId,
            content: pendingTribute.content,
            relationCategory: pendingTribute.relationCategory,
            photos: pendingTribute.photos,
            candleCount: pendingTribute.candleCount,
            flowerCount: pendingTribute.flowerCount
          }
        });

        if (publishError) {
          console.error('Error publishing tribute:', publishError);
          setError('Une erreur est survenue lors de la publication de votre hommage.');
          toast.error('Erreur lors de la publication');
        } else {
          toast.success('Votre hommage a été déposé et attend sa validation éditoriale.');
          setIsPublished(true);
        }

        // Clear the pending tribute regardless of outcome
        sessionStorage.removeItem('pendingTribute');
        
      } catch (err) {
        console.error('Error processing pending tribute:', err);
        setError('Une erreur est survenue.');
        sessionStorage.removeItem('pendingTribute');
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
                  Publication en cours...
                </h1>
                <p className="text-memorial-dark-muted text-lg">
                  Votre hommage est en cours de publication. Veuillez patienter.
                </p>
              </div>
            </>
          ) : error ? (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-destructive" />
                </div>
              </div>
              <div className="space-y-4">
                <h1 className="font-serif text-3xl font-medium">
                  Paiement réussi
                </h1>
                <p className="text-memorial-dark-muted text-lg">
                  {error}
                </p>
                <p className="text-sm text-memorial-dark-muted">
                  Votre paiement a bien été enregistré. Veuillez contacter le support si le problème persiste.
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
                  {isPublished ? "Hommage déposé" : "Paiement réussi"}
                </h1>
                <p className="text-memorial-dark-muted text-lg">
                  {isPublished 
                    ? "La visibilité de votre hommage reste soumise à la validation éditoriale."
                    : "Votre paiement a été traité avec succès."
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
