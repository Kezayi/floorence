import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Quote } from "lucide-react";

interface FeaturedTribute {
  id: string;
  author_name: string;
  relation_category: string;
  content: string;
  created_at: string;
  memorial_id: string;
  first_name: string;
  last_name: string;
  share_token: string | null;
}

const FALLBACK_QUOTES = [
  "Ceux que nous aimons ne disparaissent jamais vraiment. Ils marchent à nos côtés chaque jour.",
  "La mémoire est le parfum de l'âme. — George Sand",
  "On ne meurt vraiment que lorsqu'on est oublié.",
];

const HommageFeatured = () => {
  const [tributes, setTributes] = useState<FeaturedTribute[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchTributes = async () => {
      const { data } = await supabase
        .from("guestbook_posts")
        .select(`
          id, author_name, relation_category, content, created_at, memorial_id,
          memorials!guestbook_posts_memorial_fk (first_name, last_name, share_token)
        `)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(200);

      if (data && data.length > 0) {
        const mapped: FeaturedTribute[] = data
          .filter((d: any) => d.memorials) // safety
          .map((d: any) => ({
            id: d.id,
            author_name: d.author_name,
            relation_category: d.relation_category,
            content: d.content,
            created_at: d.created_at,
            memorial_id: d.memorial_id,
            first_name: d.memorials.first_name,
            last_name: d.memorials.last_name,
            share_token: d.memorials.share_token,
          }));
        setTributes(mapped);
      }
      setLoaded(true);
    };

    fetchTributes();
  }, []);

  // Deterministic hourly selection
  const currentHourSeed = useMemo(() => {
    const now = new Date();
    return now.getFullYear() * 1000000 + (now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours();
  }, []);

  const selected = useMemo(() => {
    if (tributes.length === 0) return null;
    const index = currentHourSeed % tributes.length;
    return tributes[index];
  }, [tributes, currentHourSeed]);

  // Auto-refresh on the hour
  const [, setTick] = useState(0);
  useEffect(() => {
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000;
    const timer = setTimeout(() => setTick((t) => t + 1), msUntilNextHour);
    return () => clearTimeout(timer);
  }, []);

  if (!loaded) return null;

  // Fallback: show a quote if no tributes
  if (!selected) {
    const fallbackIndex = currentHourSeed % FALLBACK_QUOTES.length;
    return (
      <section className="px-4 py-8 md:py-12">
        <div className="container mx-auto max-w-2xl text-center">
          <p className="font-serif text-lg md:text-xl text-muted-foreground italic leading-relaxed">
            « {FALLBACK_QUOTES[fallbackIndex]} »
          </p>
        </div>
      </section>
    );
  }

  const defunctName = `${selected.first_name} ${selected.last_name}`;
  const memorialLink = `/m/${selected.share_token || selected.memorial_id}`;
  const publicationDate = new Date(selected.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Truncate long content
  const displayContent =
    selected.content.length > 280
      ? selected.content.slice(0, 277) + "…"
      : selected.content;

  return (
    <section className="px-4 py-8 md:py-12 animate-fade-in-slow">
      <div className="container mx-auto max-w-2xl text-center">
        {/* Section label */}
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-sans mb-6">
          Paroles d'Éternité
        </p>

        {/* Quote icon */}
        <Quote className="w-5 h-5 text-muted-foreground/40 mx-auto mb-4" />

        {/* Tribute text */}
        <blockquote className="font-serif text-lg md:text-xl text-foreground leading-relaxed mb-6">
          « {displayContent} »
        </blockquote>

        {/* Attribution */}
        <div className="space-y-1">
          <p className="text-sm font-sans text-muted-foreground">
            — {selected.author_name}
            {selected.relation_category && (
              <span className="text-muted-foreground/70">, {selected.relation_category}</span>
            )}
          </p>
          <p className="text-sm font-sans">
            <span className="text-muted-foreground/70">En mémoire de </span>
            <Link
              to={memorialLink}
              className="text-foreground hover:underline underline-offset-4"
            >
              {defunctName}
            </Link>
          </p>
          <p className="text-xs text-muted-foreground/50 font-sans mt-2">
            {publicationDate}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HommageFeatured;
