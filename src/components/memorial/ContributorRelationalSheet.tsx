import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Flame, Flower2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import Photo from "@/components/ui/Photo";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileData {
  resolved: boolean;
  is_self?: boolean;
  author_name?: string;
  author_photo_url?: string | null;
  totals?: { posts: number; candles: number; flowers: number };
  interactions?: { id: string; created_at: string; content: string; candles: number; flowers: number }[];
  relation?: { category: string; link: string | null; status: string } | null;
  shared_anchors?: { name: string; slug: string; my_relation: string | null; their_relation: string | null }[];
}

const PAGE = 5;

/** Server-checked eligibility (paid, confirmed gesture). Never derived from client counters. */
export const useRelationalEligibility = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["rel-p1-eligibility", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_viewer_relational_eligibility");
      if (error) return false;
      return data === true;
    },
  });
};

interface Props {
  postId: string | null;
  deceasedName: string;
  onClose: () => void;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="py-6 border-t border-border">
    <h3 className="font-serif text-lg text-foreground mb-4">{title}</h3>
    {children}
  </section>
);

const ContributorRelationalSheet = ({ postId, deceasedName, onClose }: Props) => {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rel-p1-profile", postId, page],
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_contributor_profile", {
        p_post_id: postId!, p_limit: PAGE, p_offset: page * PAGE,
      });
      if (error) throw error;
      return data as unknown as ProfileData;
    },
  });

  const total = data?.totals?.posts ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const name = data?.author_name || "Contributeur";

  return (
    <Sheet open={!!postId} onOpenChange={(o) => { if (!o) { setPage(0); onClose(); } }}>
      <SheetContent side="right" className="w-full sm:max-w-[440px] max-h-[100svh] overflow-y-auto bg-background p-6 motion-reduce:transition-none">
        <button onClick={onClose} className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour aux hommages
        </button>

        {isLoading && <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-32 w-full" /></div>}
        {isError && <p className="font-sans text-sm text-muted-foreground">Cette fiche n'est pas accessible.</p>}

        {data && !data.resolved && (
          <>
            <SheetTitle className="font-serif text-xl">Identité non vérifiée</SheetTitle>
            <SheetDescription className="mt-2">Ce contributeur ne peut pas être identifié de manière fiable.</SheetDescription>
          </>
        )}

        {data?.resolved && (
          <>
            <header className="flex items-center gap-4 pb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-accent/40 shrink-0">
                <Photo src={data.author_photo_url} alt={`Portrait de ${name}`} fallbackName={name} variant="node" tone="none" targetWidth={64} targetHeight={64} />
              </div>
              <div className="min-w-0">
                <SheetTitle className="font-serif text-xl text-foreground">{name}</SheetTitle>
                <SheetDescription className="font-sans text-xs">Contributeur · mémorial de {deceasedName}</SheetDescription>
              </div>
            </header>

            <Section title="Ses interactions">
              <p className="font-sans text-xs text-muted-foreground mb-4">
                {total} hommage{total > 1 ? "s" : ""} · {data.totals?.candles ?? 0} cierge(s) · {data.totals?.flowers ?? 0} fleur(s)
              </p>
              <ol className="space-y-4">
                {data.interactions?.map((it) => (
                  <li key={it.id} className="border-l border-accent/50 pl-4">
                    <time className="block font-sans text-[11px] text-muted-foreground">{fmt(it.created_at)} · 1 RIP</time>
                    <p className="font-serif italic text-foreground mt-1 line-clamp-4">« {it.content} »</p>
                    <div className="flex gap-3 mt-2 font-sans text-xs">
                      {it.candles > 0 && <span className="inline-flex items-center gap-1 text-[hsl(var(--gesture-candle))]"><Flame className="w-3 h-3" />{it.candles}</span>}
                      {it.flowers > 0 && <span className="inline-flex items-center gap-1 text-[hsl(var(--gesture-flower))]"><Flower2 className="w-3 h-3" />{it.flowers}</span>}
                    </div>
                  </li>
                ))}
              </ol>
              {pages > 1 && (
                <div className="flex items-center justify-between mt-4 font-sans text-xs">
                  <button disabled={page === 0} onClick={() => setPage(page - 1)} className="disabled:opacity-60">Précédent</button>
                  <span className="text-muted-foreground">{page + 1} / {pages}</span>
                  <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="disabled:opacity-60">Suivant</button>
                </div>
              )}
            </Section>

            <Section title="Son lien avec le défunt">
              {data.relation?.link || data.relation?.category ? (
                <dl className="font-sans text-sm space-y-1">
                  <div><dt className="inline text-muted-foreground">Lien : </dt><dd className="inline text-foreground">{data.relation.link || data.relation.category}</dd></div>
                  {data.relation.link && <div><dt className="inline text-muted-foreground">Catégorie : </dt><dd className="inline">{data.relation.category}</dd></div>}
                  <div><dt className="inline text-muted-foreground">Statut : </dt><dd className="inline">Déclaré par le contributeur</dd></div>
                </dl>
              ) : <p className="font-sans text-sm text-muted-foreground">Lien non renseigné</p>}
            </Section>

            <Section title="Mon lien avec cette personne">
              {data.is_self ? (
                <p className="font-sans text-sm text-muted-foreground">Il s'agit de votre propre fiche.</p>
              ) : data.shared_anchors && data.shared_anchors.length > 0 ? (
                <ul className="space-y-3 font-sans text-sm">
                  {data.shared_anchors.map((a) => (
                    <li key={a.slug}>
                      Vous êtes tous deux liés à{" "}
                      <Link to={`/memorial/${a.slug}`} className="font-serif text-base underline decoration-accent underline-offset-4">{a.name}</Link>
                      <span className="block text-xs text-muted-foreground mt-0.5">Vous : {a.my_relation || "—"} · Cette personne : {a.their_relation || "—"}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="font-sans text-sm text-muted-foreground">Aucun lien établi ou accessible.</p>}
            </Section>
          </>
        )}

        <button onClick={onClose} className="mt-6 w-full border border-border py-3 font-sans text-sm hover:border-accent">
          Retourner à l'hommage
        </button>
      </SheetContent>
    </Sheet>
  );
};

export default ContributorRelationalSheet;
