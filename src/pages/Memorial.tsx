import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemorialHero from "@/components/memorial/MemorialHero";
import DeathNotice from "@/components/memorial/DeathNotice";
import GatheringsCalendar from "@/components/memorial/GatheringsCalendar";
import AnniversaryReminder from "@/components/memorial/AnniversaryReminder";

import ContributionLink from "@/components/memorial/ContributionLink";
import GuestbookPost, { GuestbookPostData } from "@/components/memorial/GuestbookPost";
import GuestbookForm from "@/components/memorial/GuestbookForm";
import GuestbookPagination from "@/components/memorial/GuestbookPagination";
import RelationshipMaillage from "@/components/memorial/RelationshipMaillage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ChevronLeft, FileText, Calendar, Book, GitBranch } from "lucide-react";
import { useMemorials } from "@/contexts/MemorialsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";

interface MemorialEvent {
  id: string;
  event_type: string;
  event_date: string;
  event_end_time?: string;
  location?: string;
  description?: string;
  is_public: boolean;
}

const Memorial = () => {
  const { slug } = useParams();
  const { memorials } = useMemorials();
  const { user } = useAuth();
  const guestbookFormRef = useRef<HTMLDivElement>(null);
  
  const [currentGuestbookPage, setCurrentGuestbookPage] = useState(1);
  const [memorialEvents, setMemorialEvents] = useState<MemorialEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { data: settings } = useSystemSettings();
  const POSTS_PER_PAGE = 5;
  
  // Check if contributions are enabled globally
  const contributionsEnabled = settings?.contribution_link_template.enabled && settings?.contribution_link_template.url;

  // Find the memorial by slug from context
  const memorialData = useMemo(() => {
    return memorials.find((m) => m.slug === slug);
  }, [memorials, slug]);

  // Helper to check if string is valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fetch events from database (only for real UUIDs, not mock data)
  useEffect(() => {
    const fetchEvents = async () => {
      if (!memorialData?.id) return;
      
      // Skip database fetch for mock data (non-UUID IDs)
      if (!isValidUUID(memorialData.id)) {
        setEventsLoading(false);
        setMemorialEvents([]);
        return;
      }
      
      setEventsLoading(true);
      try {
        const { data, error } = await supabase
          .from('memorial_events')
          .select('*')
          .eq('memorial_id', memorialData.id)
          .order('event_date', { ascending: true });

        if (error) {
          console.error('Error fetching events:', error);
        } else {
          setMemorialEvents(data || []);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, [memorialData?.id]);

  // State for guestbook posts from database
  const [guestbookPosts, setGuestbookPosts] = useState<GuestbookPostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Fetch guestbook posts from Supabase
  const fetchGuestbookPosts = useCallback(async () => {
    if (!memorialData?.id) return;
    
    // Skip database fetch for mock data (non-UUID IDs)
    if (!isValidUUID(memorialData.id)) {
      // For mock data, use the local messages
      const mockPosts: GuestbookPostData[] = memorialData.guestbookMessages.map((msg, index) => ({
        id: msg.id,
        authorId: `user-${index}`,
        authorName: msg.authorName,
        relationCategory: msg.relationCategory,
        content: msg.content,
        photos: [],
        createdAt: new Date(Date.now() - index * 86400000).toISOString(),
        candleCount: msg.candleCount || 0,
        flowerCount: msg.flowerCount || 0,
      }));
      setGuestbookPosts(mockPosts);
      setPostsLoading(false);
      return;
    }

    setPostsLoading(true);
    try {
      // Use the RPC function to get public guestbook posts
      const { data, error } = await supabase
        .rpc('get_public_guestbook_posts', { p_memorial_id: memorialData.id });

      if (error) {
        console.error('Error fetching guestbook posts:', error);
        setGuestbookPosts([]);
      } else {
        const posts: GuestbookPostData[] = (data || []).map((post: {
          id: string;
          user_id: string | null;
          author_name: string;
          relation_category: string;
          content: string;
          photos: string[] | null;
          created_at: string;
          candle_count: number;
          flower_count: number;
        }) => ({
          id: post.id,
          authorId: post.user_id || 'anonymous',
          authorName: post.author_name,
          relationCategory: post.relation_category,
          content: post.content,
          photos: post.photos || [],
          createdAt: post.created_at,
          candleCount: post.candle_count,
          flowerCount: post.flower_count,
        }));
        setGuestbookPosts(posts);
      }
    } catch (err) {
      console.error('Error fetching guestbook posts:', err);
      setGuestbookPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [memorialData?.id, memorialData?.guestbookMessages]);

  // Fetch posts when memorial changes
  useEffect(() => {
    fetchGuestbookPosts();
  }, [fetchGuestbookPosts]);

  // Reset page when memorial changes
  useEffect(() => {
    setCurrentGuestbookPage(1);
  }, [slug]);

  // Pagination calculations
  const totalGuestbookPages = Math.ceil(guestbookPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentGuestbookPage - 1) * POSTS_PER_PAGE;
    return guestbookPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [guestbookPosts, currentGuestbookPage, POSTS_PER_PAGE]);

  // Calculate totals from all posts
  const totals = useMemo(() => {
    return guestbookPosts.reduce(
      (acc, post) => ({
        ripCount: acc.ripCount + 1,
        candleCount: acc.candleCount + post.candleCount,
        flowerCount: acc.flowerCount + post.flowerCount,
      }),
      { ripCount: 0, candleCount: 0, flowerCount: 0 }
    );
  }, [guestbookPosts]);

  const currentUserId = "user-current";
  const userHasPosted = guestbookPosts.some((post) => post.authorId === currentUserId);

  // Check if current user is the memorial owner
  const isOwner = user?.id === memorialData?.createdBy || false;

  // SEO: Update meta tags for this memorial
  useSEO({
    title: memorialData ? `Hommage à ${memorialData.name}` : undefined,
    description: memorialData 
      ? `${memorialData.bio.substring(0, 150)}${memorialData.bio.length > 150 ? "..." : ""}`
      : undefined,
    image: memorialData?.photos?.[0],
    type: "article",
    url: memorialData ? `${window.location.origin}/memorial/${memorialData.slug}` : undefined,
  });

  // If memorial not found, show error page
  if (!memorialData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl mb-4">Espace mémoriel introuvable</h1>
            <p className="text-muted-foreground mb-6">
              L'espace mémoriel que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Link to="/" className="btn-memorial">
              Retour à l'accueil
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Create memorial object with additional computed properties
  const memorial = {
    ...memorialData,
    publishedAt: "Récemment",
    enableContributions: memorialData.type === "RECENT" && (memorialData.donationEnabled ?? true),
    funeralDate: memorialData.funeralDate,
    funeralLocation: memorialData.funeralLocation,
  };

  const handleAddCandles = (postId: string, count: number) => {
    console.log(`Payment for ${count} candles on post ${postId}`);
    setGuestbookPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, candleCount: post.candleCount + count }
          : post
      )
    );
  };

  const handleAddFlowers = (postId: string, count: number) => {
    console.log(`Payment for ${count} flowers on post ${postId}`);
    setGuestbookPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, flowerCount: post.flowerCount + count }
          : post
      )
    );
  };

  const handleSubmitPost = async (data: {
    content: string;
    relationCategory: string;
    photos: string[];
    candleCount: number;
    flowerCount: number;
  }) => {
    if (!memorialData?.id || !user) {
      toast.error("Erreur: Vous devez être connecté pour publier");
      return;
    }

    // For mock data, just update local state
    if (!isValidUUID(memorialData.id)) {
      const newPost: GuestbookPostData = {
        id: `m${Date.now()}`,
        authorId: user.id,
        authorName: user.user_metadata?.full_name || user.email?.split('@')[0] || "Utilisateur",
        relationCategory: data.relationCategory,
        content: data.content,
        photos: data.photos,
        createdAt: new Date().toISOString(),
        candleCount: data.candleCount,
        flowerCount: data.flowerCount,
      };
      setGuestbookPosts((prev) => [newPost, ...prev]);
      toast.success("Votre hommage a été publié");
      return;
    }

    // For real memorials, call the edge function
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const response = await supabase.functions.invoke('publish-tribute', {
        body: {
          memorialId: memorialData.id,
          content: data.content,
          relationCategory: data.relationCategory,
          photos: data.photos,
          candleCount: data.candleCount,
          flowerCount: data.flowerCount,
        },
      });

      if (response.error) {
        console.error('Publish error:', response.error);
        toast.error(response.error.message || "Erreur lors de la publication");
        return;
      }

      if (response.data?.success) {
        toast.success("Votre hommage a été publié avec succès");
        // Refresh the posts from database
        await fetchGuestbookPosts();
      } else {
        toast.error(response.data?.error || "Erreur lors de la publication");
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error("Une erreur est survenue lors de la publication");
    }
  };

  const scrollToGuestbook = () => {
    guestbookFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToDarkZone = () => {
    document.querySelector(".dark-zone")?.scrollIntoView({ behavior: "smooth" });
  };

  // Convert death date for anniversary component (safely handle invalid dates)
  const deathDateISO = (() => {
    if (!memorialData.deathDate) return "";
    try {
      const date = new Date(memorialData.deathDate);
      // Check if date is valid before calling toISOString
      if (isNaN(date.getTime())) return "";
      return date.toISOString();
    } catch {
      return "";
    }
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-16 md:pt-20">
        {/* Back Link */}
        <div className="container mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Hero Section */}
        <MemorialHero 
          memorial={{
            id: memorial.id,
            slug: memorial.slug,
            name: memorial.name,
            birthDate: memorial.birthDate,
            deathDate: memorial.deathDate,
            bio: memorial.bio,
            photos: memorial.photos,
            author: memorial.author,
            publishedAt: memorial.publishedAt,
            guestbookMessages: memorial.guestbookMessages.map(msg => ({
              authorName: msg.authorName,
              relationCategory: msg.relationCategory,
            })),
          }}
          onScrollToGuestbook={scrollToGuestbook}
          gestureTotals={totals}
          userHasPosted={userHasPosted}
          onGestureClick={(type) => {
            if (type === 'rip') {
              scrollToDarkZone();
            } else if (type === 'candle') {
              if (!userHasPosted) {
                alert("Vous devez d'abord publier un message dans le livre d'or pour allumer des cierges.");
                return;
              }
              scrollToDarkZone();
            } else if (type === 'flower') {
              if (!userHasPosted) {
                alert("Vous devez d'abord publier un message dans le livre d'or pour déposer des fleurs.");
                return;
              }
              scrollToDarkZone();
            }
          }}
        />

        {/* Anniversary Reminder - shown if death date exists */}
        {deathDateISO && (
          <div className="container mx-auto px-4 pb-6">
            <div className="max-w-2xl">
              <AnniversaryReminder 
                deathDate={deathDateISO} 
                name={memorial.name} 
              />
            </div>
          </div>
        )}

        <div className="divider-elegant" />

        {/* Tabs Content */}
        <section className="container mx-auto px-4 py-12">
          <Tabs defaultValue="notice" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto mb-8 overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="notice"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Avis de décès</span>
                <span className="sm:hidden">Avis</span>
              </TabsTrigger>
              
              <TabsTrigger
                value="gatherings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Recueillements</span>
                <span className="sm:hidden">Calendrier</span>
              </TabsTrigger>
              
              <TabsTrigger
                value="relationships"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap"
              >
                <GitBranch className="w-4 h-4" />
                <span className="hidden sm:inline">Maillage</span>
                <span className="sm:hidden">Liens</span>
              </TabsTrigger>
              
              {memorial.enableContributions && contributionsEnabled && (
                <TabsTrigger
                  value="contributions"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap"
                >
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline">Contributions</span>
                  <span className="sm:hidden">Aider</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Avis de décès + Programme obsèques */}
            <TabsContent value="notice" className="mt-0">
              <div className="max-w-2xl">
                <DeathNotice
                  memorial={{
                    name: memorial.name,
                    birthDate: memorial.birthDate,
                    deathDate: memorial.deathDate,
                    bio: memorial.bio,
                    funeralDate: memorial.funeralDate,
                    funeralLocation: memorial.funeralLocation,
                  }}
                  events={memorialEvents}
                />
              </div>
            </TabsContent>

            {/* Recueillements / Calendrier */}
            <TabsContent value="gatherings" className="mt-0">
              <div className="max-w-2xl">
                <GatheringsCalendar
                  events={memorialEvents}
                  memorialName={memorial.name}
                  isOwner={isOwner}
                  onAddEvent={() => {
                    // TODO: Open add event modal
                    console.log("Add event clicked");
                  }}
                />
              </div>
            </TabsContent>

            {/* Maillage relationnel */}
            <TabsContent value="relationships" className="mt-0">
              <div className="max-w-3xl">
                <RelationshipMaillage 
                  deceasedName={memorial.name}
                  posts={guestbookPosts.map(post => ({
                    authorId: post.authorId,
                    authorName: post.authorName,
                    relationCategory: post.relationCategory,
                  }))}
                />
              </div>
            </TabsContent>

            {/* Contributions - External Link */}
            {memorial.enableContributions && contributionsEnabled && (
              <TabsContent value="contributions" className="mt-0">
                <div className="max-w-2xl">
                  <ContributionLink deceasedName={memorial.name} />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </section>

        {/* Guestbook - Dark Zone */}
        <section className="dark-zone section-padding">
          <div className="container mx-auto">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Book className="w-6 h-6 text-memorial-dark-foreground" />
                <h2 className="text-memorial-dark-foreground">Livre d'or</h2>
              </div>
              <p className="font-serif text-memorial-dark-muted mb-1">
                Partagez un souvenir ou un message de soutien à la famille
              </p>
              <p className="text-xs text-memorial-dark-muted/70 mb-8 font-sans">
                {guestbookPosts.length} message{guestbookPosts.length > 1 ? "s" : ""}
              </p>

              {/* Message Form */}
              <div ref={guestbookFormRef}>
                <GuestbookForm memorialId={memorialData.id} onSubmit={handleSubmitPost} />
              </div>

              {/* Posts List - Paginated */}
              <div className="divide-y divide-memorial-dark-muted/20 mt-8">
                {paginatedPosts.map((post) => (
                  <GuestbookPost
                    key={post.id}
                    post={post}
                    isOwner={post.authorId === currentUserId}
                    onAddCandles={handleAddCandles}
                    onAddFlowers={handleAddFlowers}
                  />
                ))}
              </div>

              {/* Pagination */}
              <GuestbookPagination
                currentPage={currentGuestbookPage}
                totalPages={totalGuestbookPages}
                onPageChange={setCurrentGuestbookPage}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Memorial;
