import { useState } from "react";
import { ThumbsUp } from "lucide-react";

interface AuthorCredibilityProps {
  authorId: string;
  initialCount: number;
}

const AuthorCredibility = ({ authorId, initialCount }: AuthorCredibilityProps) => {
  // Track credibility count and if current user has already given a point
  const [count, setCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(() => {
    // Check localStorage to see if user already voted for this author
    const voted = localStorage.getItem(`credibility-${authorId}`);
    return voted === "true";
  });

  const handleClick = () => {
    if (hasVoted) return; // Cannot vote twice - point cannot be removed
    
    setCount((prev) => prev + 1);
    setHasVoted(true);
    // Persist vote permanently
    localStorage.setItem(`credibility-${authorId}`, "true");
  };

  return (
    <button
      onClick={handleClick}
      disabled={hasVoted}
      className={`inline-flex items-center gap-1.5 text-xs font-sans mb-4 transition-all ${
        hasVoted
          ? "text-primary cursor-default"
          : "text-muted-foreground hover:text-primary cursor-pointer"
      }`}
      title={hasVoted ? "Vous avez déjà noté cet auteur" : "Donner un point de crédibilité à l'auteur"}
    >
      <ThumbsUp className={`w-3 h-3 ${hasVoted ? "fill-primary" : ""}`} />
      <span>Crédibilité de l'auteur</span>
      <span className="font-medium text-foreground">{count}</span>
    </button>
  );
};

export default AuthorCredibility;
