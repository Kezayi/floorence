import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { searchWithRelations, SearchableMemorial, SearchWithRelationsResult } from "@/lib/searchWithRelations";
import SearchResults from "./SearchResults";

interface SearchBarProps {
  memorials: SearchableMemorial[];
  className?: string;
}

const SearchBar = ({ memorials, className = "" }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchWithRelationsResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      const searchResults = searchWithRelations(query, memorials);
      setResults(searchResults);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, memorials]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults(null);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher un défunt ou un proche..."
          className="w-full pl-10 pr-10 py-2.5 bg-secondary border border-border rounded-sm font-sans text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={handleClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted text-muted-foreground text-xs font-sans rounded border border-border">
          {query ? null : (
            <>
              <span className="text-[10px]">⌘</span>K
            </>
          )}
        </kbd>
      </div>

      {/* Results Dropdown */}
      {isOpen && query && results && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-sm shadow-xl z-50 overflow-hidden">
          <SearchResults
            results={results.results}
            relationships={results.relationships}
            clusters={results.clusters}
            query={query}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
};

export default SearchBar;
