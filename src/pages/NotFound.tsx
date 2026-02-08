import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-6xl font-light mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-2 font-sans">
            Page introuvable
          </p>
          <p className="text-sm text-muted-foreground mb-8 font-sans max-w-md mx-auto">
            L'adresse que vous avez saisie ne correspond à aucune page existante.
          </p>
          <Link to="/" className="btn-memorial">
            Retour à l'accueil
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
