import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InfinityScrollLoaderProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const InfinityScrollLoader = ({ hasMore, loading, onLoadMore }: InfinityScrollLoaderProps) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) {
    return (
      <div className="text-center py-10">
        <p className="font-serif text-muted-foreground italic text-sm">
          Fin des souvenirs partagés
        </p>
      </div>
    );
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-8">
      {loading && (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      )}
    </div>
  );
};

export default InfinityScrollLoader;
