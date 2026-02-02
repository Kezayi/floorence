import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");

  return (
    <div className="min-h-screen flex flex-col bg-memorial-dark text-memorial-dark-foreground">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-medium">
              Paiement réussi
            </h1>
            <p className="text-memorial-dark-muted text-lg">
              Votre hommage a été publié avec succès. Merci pour votre contribution.
            </p>
            {reference && (
              <p className="text-sm text-memorial-dark-muted">
                Référence: <span className="font-mono">{reference}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
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
              className="gap-2 bg-memorial-dark-foreground text-memorial-dark hover:bg-memorial-dark-foreground/90"
            >
              <Link to="/rechercher">
                <ArrowLeft className="w-4 h-4" />
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
