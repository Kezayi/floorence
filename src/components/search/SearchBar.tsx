import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  className?: string;
}

const SearchBar = ({ className = "" }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(query.trim())}`);
    }
  }, [query, navigate]);

  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un défunt ou un proche..."
        className="w-full pl-10 pr-10 py-2.5 bg-secondary border border-border rounded-sm font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
};

export default SearchBar;
