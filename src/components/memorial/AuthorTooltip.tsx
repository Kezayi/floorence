import { ReactNode } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useSocialInferenceByUser } from "@/hooks/useSocialInferences";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Flower2, GitBranch, Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthorTooltipProps {
  authorId: string;
  authorName: string;
  children: ReactNode;
}

/** Category badge styles for the tooltip */
const categoryBadgeStyle: Record<string, string> = {
  "FAMILLE DIRECTE": "bg-foreground/10 text-foreground",
  "FAMILLE ELARGIE": "bg-foreground/10 text-muted-foreground",
  "ALLIES": "bg-[hsl(var(--gesture-candle)/0.15)] text-[hsl(var(--gesture-candle))]",
  "SOCIO COEUR": "bg-[hsl(var(--gesture-flower)/0.15)] text-[hsl(var(--gesture-flower))]",
};

const getCategoryStyle = (cat: string): string => {
  const upper = cat.toUpperCase();
  for (const key of Object.keys(categoryBadgeStyle)) {
    if (upper.includes(key)) return categoryBadgeStyle[key];
  }
  return "bg-muted text-muted-foreground";
};

const AuthorTooltip = ({ authorId, authorName, children }: AuthorTooltipProps) => {
  const { user } = useAuth();
  const { data: inference } = useSocialInferenceByUser(authorId);

  // Don't wrap in tooltip if no data or anonymous
  if (!authorId || authorId === "anonymous") {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-80 p-0 overflow-hidden"
      >
        {user ? (
          // Authenticated: show full details
          inference ? (
            <div>
              {/* Header */}
              <div className="bg-foreground/5 px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-serif font-medium text-primary">
                      {authorName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-serif text-sm font-medium text-foreground leading-tight">
                      {authorName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-sans">
                      <Flower2 className="w-3 h-3" />
                      <span>
                        Actif sur{" "}
                        <strong className="text-foreground">
                          {inference.totalMemorials}
                        </strong>{" "}
                        mémorial{inference.totalMemorials > 1 ? "x" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed roles per memorial */}
              {inference.detailLiens.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  <h5 className="text-[10px] font-sans font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Liens déclarés
                  </h5>
                  {inference.detailLiens.slice(0, 5).map((dl, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] text-foreground font-sans font-medium">
                          {dl.lien}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-sans">
                          {" "}de {dl.defunt}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-sm font-sans whitespace-nowrap uppercase tracking-wide ${getCategoryStyle(dl.categorie)}`}
                      >
                        {dl.categorie}
                      </span>
                    </div>
                  ))}
                  {inference.detailLiens.length > 5 && (
                    <p className="text-[10px] text-muted-foreground/60 italic font-sans">
                      +{inference.detailLiens.length - 5} autre(s)
                    </p>
                  )}
                </div>
              )}

              {/* Suggested connections */}
              {inference.connexionsSuggerees.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border bg-foreground/[0.02]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <GitBranch className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-sans font-medium text-muted-foreground uppercase tracking-wider">
                      Connexions possibles
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground font-sans">
                    {inference.connexionsSuggerees.slice(0, 3).join(", ")}
                    {inference.connexionsSuggerees.length > 3 && (
                      <span className="text-muted-foreground">
                        {" "}et {inference.connexionsSuggerees.length - 3} autre(s)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <h4 className="font-serif text-sm font-medium">{authorName}</h4>
                <p className="text-[11px] text-muted-foreground font-sans">
                  Contributeur
                </p>
              </div>
            </div>
          )
        ) : (
          // Anonymous: show limited info with auth prompt
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-serif font-medium text-primary">
                  {authorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h4 className="font-serif text-sm font-medium">{authorName}</h4>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-sans">
              <Lock className="w-3 h-3" />
              <Link to="/auth" className="text-primary hover:underline underline-offset-4">
                Connectez-vous
              </Link>
              <span>pour voir les liens</span>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default AuthorTooltip;
