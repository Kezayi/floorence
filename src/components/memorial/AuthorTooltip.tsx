import { ReactNode } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useSocialInferenceByUser } from "@/hooks/useSocialInferences";
import { Users, Flower2, GitBranch } from "lucide-react";
import { getRelationCategory } from "@/lib/relationCategoryUtils";

interface AuthorTooltipProps {
  authorId: string;
  authorName: string;
  children: ReactNode;
}

/** Category badge styles for the tooltip */
const categoryBadgeStyle: Record<string, string> = {
  "Famille directe": "bg-foreground/10 text-foreground",
  "Famille élargie": "bg-foreground/10 text-muted-foreground",
  "Alliés": "bg-[hsl(var(--gesture-candle)/0.15)] text-[hsl(var(--gesture-candle))]",
  "Socio cœur (Amis)": "bg-[hsl(var(--gesture-flower)/0.15)] text-[hsl(var(--gesture-flower))]",
  "Autres": "bg-muted text-muted-foreground",
};

const AuthorTooltip = ({ authorId, authorName, children }: AuthorTooltipProps) => {
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
        className="w-72 p-0 overflow-hidden"
      >
        {inference ? (
          <div>
            {/* Header */}
            <div className="bg-foreground/5 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-serif font-medium text-primary">
                    {authorName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-serif text-sm font-medium text-foreground leading-tight">
                    {authorName}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-sans">
                    {inference.rolesSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                <Flower2 className="w-3.5 h-3.5" />
                <span>
                  Actif sur{" "}
                  <strong className="text-foreground">
                    {inference.totalMemorialsLinked}
                  </strong>{" "}
                  mémorial{inference.totalMemorialsLinked > 1 ? "x" : ""}
                </span>
              </div>

              {/* Detailed roles per memorial */}
              {inference.detailedInferences.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {inference.detailedInferences.slice(0, 4).map((inf, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-[11px] text-muted-foreground font-sans truncate flex-1">
                        {inf.memorial_slug}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-sm font-sans whitespace-nowrap ${
                          categoryBadgeStyle[inf.role] || categoryBadgeStyle["Autres"]
                        }`}
                      >
                        {inf.role}
                      </span>
                    </div>
                  ))}
                  {inference.detailedInferences.length > 4 && (
                    <p className="text-[10px] text-muted-foreground/60 italic font-sans">
                      +{inference.detailedInferences.length - 4} autre(s)
                    </p>
                  )}
                </div>
              )}
            </div>
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
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

export default AuthorTooltip;
