import Header from "@/components/layout/Header";
import MemorialCard from "@/components/memorial/MemorialCard";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import EmptyState from "@/components/ui/empty-state";
import { LayoutGrid, Grid3X3, List, Square, Heart } from "lucide-react";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaginatedMemorials } from "@/hooks/usePaginatedMemorials";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

// Code splitting: below-the-fold / non-critical modules
const Footer = lazy(() => import("@/components/layout/Footer"));
const InfinityScrollLoader = lazy(() => import("@/components/home/InfinityScrollLoader"));
const UpcomingEvents = lazy(() => import("@/components/home/UpcomingEvents"));
const HommageFeatured = lazy(() => import("@/components/home/HommageFeatured"));

type ViewMode = "grid-4" | "grid-3" | "grid-2" | "list";
type FilterType = "all" | "RECENT" | "PAST";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("grid-4");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const { memorials, loading, loadingMore, hasMore, totalCount, loadMore } = usePaginatedMemorials();
  const { data: eventsData, isLoading: eventsLoading } = useUpcomingEvents();

  // Set default view mode based on device
  useEffect(() => {
    if (isMobile) {
      setViewMode("list");
    } else {
      setViewMode("grid-4");
    }
  }, [isMobile]);

  // Client-side filter on loaded data (server returns all published)
  const filteredMemorials = useMemo(() => {
    if (filterType === "all") return memorials;
    return memorials.filter(m => m.type === filterType);
  }, [memorials, filterType]);

  // Preload LCP : portrait du premier mémorial affiché (Norme AAA — Pilier 2)
  const lcpPhotoUrl = filteredMemorials[0]?.photoUrl;
  const lcpIsList = viewMode === "list";
  useEffect(() => {
    if (!lcpPhotoUrl) return;
    const width = lcpIsList ? 160 : 400;
    const height = lcpIsList ? 213 : 533;
    const href = getOptimizedImageUrl(lcpPhotoUrl, { width, height });
    const srcset = getOptimizedSrcSet(lcpPhotoUrl, { width, height });
    if (!href) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    if (srcset) link.setAttribute("imagesrcset", srcset);
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [lcpPhotoUrl, lcpIsList]);

  const getGridClass = () => {
    switch (viewMode) {
      case "grid-4":
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case "grid-3":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case "grid-2":
        return "grid-cols-1 md:grid-cols-2";
      case "list":
        return "grid-cols-1";
      default:
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <div className={`grid ${getGridClass()} gap-4 md:gap-6`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 md:pt-20">

        {/* Paroles d'Éternité — Featured Tribute */}
        <Suspense fallback={<div className="reserve-block contain-section" aria-hidden="true" />}>
          <HommageFeatured />
        </Suspense>

        {/* Memorial Grid */}
        <section className="px-4 py-4 md:px-8 md:py-6 contain-section">
          <div className="container mx-auto">
            {/* Header with title and controls */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl md:text-2xl">Espaces mémoriels</h2>
                  {!loading && (
                    <span className="text-sm text-muted-foreground font-sans">
                      {totalCount} espace{totalCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                
                {/* View Mode Switcher - Desktop only */}
                <div className="hidden md:flex items-center gap-1 bg-secondary p-1 rounded">
                <button
                  onClick={() => setViewMode("grid-4")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "grid-4" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grille 4 colonnes"
                  title="Grille compacte"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid-3")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "grid-3" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grille 3 colonnes"
                  title="Grille standard"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid-2")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "grid-2" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grille 2 colonnes"
                  title="Grille large"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "list" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Liste"
                  title="Vue liste"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Filter Tabs */}
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-4 py-2 text-sm font-sans rounded-sm transition-colors ${
                    filterType === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tous
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setFilterType("RECENT")}
                      className={`px-4 py-2 text-sm font-sans rounded-sm transition-colors ${
                        filterType === "RECENT"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Récents
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-sans">
                    <p>Décès survenus il y a 6 mois ou moins</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setFilterType("PAST")}
                      className={`px-4 py-2 text-sm font-sans rounded-sm transition-colors ${
                        filterType === "PAST"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Passés
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-sans">
                    <p>Décès survenus il y a plus de 6 mois</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

            {loading ? (
              renderSkeleton()
            ) : memorials.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="Aucun espace mémoriel"
                message="Soyez le premier à créer un espace mémoriel pour honorer la mémoire d'un proche disparu."
                actionLabel="Créer le premier mémorial"
                onAction={() => navigate("/creer")}
              />
            ) : filteredMemorials.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-sans">
                  Aucun espace mémoriel {filterType === "RECENT" ? "récent" : "passé"} trouvé.
                </p>
              </div>
            ) : (
              <>
                <div className={`grid ${getGridClass()} gap-4 md:gap-6 reserve-grid contain-section`}>
                  {filteredMemorials.map((memorial, index) => (
                    <MemorialCard
                      key={memorial.id}
                      id={memorial.id}
                      slug={memorial.slug}
                      shareToken={memorial.shareToken}
                      name={memorial.name}
                      birthDate={memorial.birthDate}
                      deathDate={memorial.deathDate}
                      photoUrl={memorial.photoUrl}
                      ripCount={memorial.ripCount}
                      candleCount={memorial.candleCount}
                      flowerCount={memorial.flowerCount}
                      type={memorial.type}
                      variant={viewMode === "list" ? "list" : "card"}
                      priority={index < 4}
                      isDemo={memorial.isDemo}
                    />
                  ))}
                </div>
                
                <Suspense fallback={<div className="h-16" aria-hidden="true" />}>
                <InfinityScrollLoader
                  hasMore={hasMore}
                  loading={loadingMore}
                  onLoadMore={loadMore}
                />
                </Suspense>
              </>
            )}
          </div>
        </section>

        {/* Upcoming Events Section */}
        <section className="px-4 py-6 md:px-8 md:py-10 border-t border-border contain-section">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <Suspense fallback={<div className="reserve-block" aria-hidden="true" />}>
              <UpcomingEvents type="funerals" title="Prochains Obsèques" events={eventsData?.funerals ?? []} loading={eventsLoading} />
              <UpcomingEvents type="gatherings" title="Prochains Recueillements" events={eventsData?.gatherings ?? []} loading={eventsLoading} />
              </Suspense>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={<div className="h-40" aria-hidden="true" />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
