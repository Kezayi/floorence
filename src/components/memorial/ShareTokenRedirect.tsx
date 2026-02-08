import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Loader2 } from "lucide-react";

/**
 * ShareTokenRedirect — Resolves a share_token to the actual memorial slug.
 * Used for obfuscated sharing URLs (/m/:token) so that readable slugs
 * never appear in shared links (WhatsApp, Facebook, SMS).
 */
const ShareTokenRedirect = () => {
  const { token } = useParams<{ token: string }>();
  const [slug, setSlug] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("memorials")
        .select("slug")
        .eq("share_token", token)
        .eq("is_active", true)
        .eq("is_published", true)
        .is("merged_into", null)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setSlug(data.slug);
      }
      setLoading(false);
    };

    resolve();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (slug) {
    return <Navigate to={`/memorial/${slug}`} replace />;
  }

  // 404 for invalid tokens — prevents enumeration
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Espace mémoriel introuvable</h1>
          <p className="text-muted-foreground mb-6">
            Ce lien de partage n'est plus valide ou a expiré.
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

export default ShareTokenRedirect;
