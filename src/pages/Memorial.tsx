import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemorialErrorBoundary from "@/components/memorial/MemorialErrorBoundary";
import MemorialHero from "@/components/memorial/MemorialHero";
import DeathNotice from "@/components/memorial/DeathNotice";
import GatheringsCalendar from "@/components/memorial/GatheringsCalendar";
import AnniversaryReminder from "@/components/memorial/AnniversaryReminder";
import EditMemorialDialog from "@/components/memorial/EditMemorialDialog";
import AddEventDialog from "@/components/memorial/AddEventDialog";
import RequestLinkDialog from "@/components/memorial/RequestLinkDialog";
import InferredLinkSuggestions from "@/components/memorial/InferredLinkSuggestions";
import TransitiveDiscoveryWidget from "@/components/memorial/TransitiveDiscoveryWidget";
import DemoGuide from "@/components/memorial/DemoGuide";
import JsonLdPerson from "@/components/memorial/JsonLdPerson";
import ContributionLink from "@/components/memorial/ContributionLink";
import GuestbookPost, { GuestbookPostData } from "@/components/memorial/GuestbookPost";
import GuestbookForm from "@/components/memorial/GuestbookForm";
import GuestbookPagination from "@/components/memorial/GuestbookPagination";
import RelationshipMaillage from "@/components/memorial/RelationshipMaillage";
import SecureDataDisplay from "@/components/memorial/SecureDataDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ChevronLeft, FileText, Calendar, Book, GitBranch } from "lucide-react";
import { useMemorials } from "@/contexts/MemorialsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useSEO } from "@/hooks/useSEO";
import { calculateAge, getMemorialType, formatDateFrench } from "@/lib/dateUtils";
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

/** Helper to check if string is valid UUID */
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/** Skeleton loader shown while memorial data is loading */
const MemorialSkeleton = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 pt-20">
      <div className="container mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-80 h-80 bg-muted rounded-sm" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-20 w-full bg-muted rounded" />
            <div className="flex gap-4">
              <div className="h-10 w-28 bg-muted rounded" />
              <div className="h-10 w-28 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

const MemorialInner = () => {
  const { slug, token } = useParams();
  const { memorials, loading: memorialsLoading } = useMemorials();
  const { user } = useAuth();
  const guestbookFormRef = useRef<HTMLDivElement>(null);
  
  const [currentGuestbookPage, setCurrentGuestbookPage] = useState(1);
  const [memorialEvents, setMemorialEvents] = useState<MemorialEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { data: settings } = useSystemSettings();
  const POSTS_PER_PAGE = 5;

  // ── DB Fallback State ──
  // When memorial not found in context, query DB directly to prevent false 404s
  const [dbFallback, setDbFallback] = useState<any>(null);
  const [dbFallbackLoading, setDbFallbackLoading] = useState(false);
  const [dbFallbackDone, setDbFallbackDone] = useState(false);
  
  // Check if contributions are enabled globally
  const contributionsEnabled = settings?.contribution_link_template?.enabled && settings?.contribution_link_template?.url;

  // Find the memorial by token, slug, or legacy_slug from context
  const contextMemorial = useMemo(() => {
    if (token) {
      return memorials.find((m) => m.shareToken === token) || null;
    }
    const bySlug = memorials.find((m) => m.slug === slug);
    if (bySlug) return bySlug;
    return memorials.find((m) => m.legacySlug === slug) || null;
  }, [memorials, slug, token]);

  // DB Fallback: If context loaded but memorial not found, try direct DB query
  useEffect(() => {
    if (memorialsLoading || contextMemorial || dbFallbackDone) return;
    
    const fetchDirect = async () => {
      setDbFallbackLoading(true);
      try {
        let query = supabase
          .from('memorials')
          .select('id, slug, first_name, last_name, birth_date, death_date, photo_url, biography, photos, default_photo_index, created_by, creator_relation, funeral_date, funeral_location, donation_enabled, legacy_slug, is_demo, share_token')
          .eq('is_published', true)
          .eq('is_active', true)
          .is('merged_into', null);

        if (token) {
          query = query.eq('share_token', token);
        } else if (slug) {
          query = query.or(`slug.eq.${slug},legacy_slug.eq.${slug}`);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('[Memorial] DB fallback error:', error);
        } else if (data) {
          console.info('[Memorial] Found via DB fallback:', data.id);
          // Fetch creator profile
          const { data: profileData } = await supabase
            .from('profiles_public')
            .select('display_name')
            .eq('user_id', data.created_by)
            .maybeSingle();

          const photos = (data.photos && data.photos.length > 0)
            ? data.photos.filter((p: string) => p && !p.startsWith('data:'))
            : (data.photo_url ? [data.photo_url] : []);

          setDbFallback({
            id: data.id,
            slug: data.slug,
            legacySlug: data.legacy_slug || null,
            name: `${data.first_name} ${data.last_name}`,
            birthDate: formatDateFrench(data.birth_date),
            deathDate: formatDateFrench(data.death_date),
            bio: data.biography || "",
            photos,
            author: {
              id: data.created_by,
              name: profileData?.display_name || "Créateur",
              relation: data.creator_relation || "Créateur de l'espace",
            },
            guestbookMessages: [],
            type: getMemorialType(formatDateFrench(data.death_date)),
            createdBy: data.created_by,
            donationEnabled: data.donation_enabled,
            funeralDate: data.funeral_date,
            funeralLocation: data.funeral_location,
            defaultPhotoIndex: data.default_photo_index || 0,
            isDemo: data.is_demo || false,
            shareToken: data.share_token || null,
          });
        } else {
          console.warn('[Memorial] Not found in DB either. Token/slug:', token || slug);
        }
      } catch (err) {
        console.error('[Memorial] DB fallback exception:', err);
      } finally {
        setDbFallbackLoading(false);
        setDbFallbackDone(true);
      }
    };

    fetchDirect();
  }, [memorialsLoading, contextMemorial, dbFallbackDone, token, slug]);

  // Use context memorial first, then DB fallback
  const memorialData = contextMemorial || dbFallback;

  // Diagnostic: Log memorial data for debugging
  useEffect(() => {
    if (memorialData) {
      console.table({
        id: memorialData.id,
        name: memorialData.name,
        slug: memorialData.slug,
        shareToken: memorialData.shareToken,
        type: memorialData.type,
        photosCount: memorialData.photos?.length ?? 0,
        hasAuthor: !!memorialData.author,
        hasBio: !!memorialData.bio,
        source: contextMemorial ? 'context' : 'db-fallback',
      });
    }
  }, [memorialData?.id]);

  // Check if we need to redirect from legacy slug to new secure token URL
  const shouldRedirect = memorialData && slug && memorialData.legacySlug === slug && memorialData.slug !== slug;

  // Calculate age for SEO
  const ageAtDeath = useMemo(() => {
    if (!memorialData) return null;
    return calculateAge(memorialData.birthDate, memorialData.deathDate);
  }, [memorialData?.birthDate, memorialData?.deathDate]);

  // Fetch events from database (only for real UUIDs, not mock data)
  useEffect(() => {
    const fetchEvents = async () => {
      if (!memorialData?.id) return;
      
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
    
    if (!isValidUUID(memorialData.id)) {
      const mockPosts: GuestbookPostData[] = (memorialData.guestbookMessages || []).map((msg: any, index: number) => ({
        id: msg?.id || `mock-${index}`,
        authorId: `user-${index}`,
        authorName: msg?.authorName || "Anonyme",
        relationCategory: msg?.relationCategory || "autre",
        content: msg?.content || "",
        photos: [],
        createdAt: new Date(Date.now() - index * 86400000).toISOString(),
        candleCount: msg?.candleCount || 0,
        flowerCount: msg?.flowerCount || 0,
      }));
      setGuestbookPosts(mockPosts);
      setPostsLoading(false);
      return;
    }

    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_public_guestbook_posts', { p_memorial_id: memorialData.id });

      if (error) {
        console.error('Error fetching guestbook posts:', error);
        setGuestbookPosts([]);
      } else {
        const posts: GuestbookPostData[] = (data || []).map((post: any) => ({
          id: post.id,
          authorId: post.user_id || 'anonymous',
          authorName: post.author_name || 'Anonyme',
          relationCategory: post.relation_category || 'autre',
          content: post.content || '',
          photos: post.photos || [],
          createdAt: post.created_at,
          candleCount: post.candle_count ?? 0,
          flowerCount: post.flower_count ?? 0,
        }));
        setGuestbookPosts(posts);
      }
    } catch (err) {
      console.error('Error fetching guestbook posts:', err);
      setGuestbookPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [memorialData?.id]);

  // Fetch posts when memorial changes
  useEffect(() => {
    fetchGuestbookPosts();
  }, [fetchGuestbookPosts]);
 
   // Realtime subscription for new posts
   useEffect(() => {
     if (!memorialData?.id || !isValidUUID(memorialData.id)) return;
 
      const channel = supabase
        .channel(`guestbook-${memorialData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'guestbook_posts',
            filter: `memorial_id=eq.${memorialData.id}`,
          },
          (payload) => {
            const newPost = payload.new as any;
           
           setGuestbookPosts((prev) => {
             if (prev.some((p) => p.id === newPost?.id)) return prev;
             
             return [
               {
                 id: newPost?.id,
                 authorId: newPost?.user_id || 'anonymous',
                 authorName: newPost?.author_name || 'Anonyme',
                 relationCategory: newPost?.relation_category || 'autre',
                 content: newPost?.content || '',
                 photos: newPost?.photos || [],
                 createdAt: newPost?.created_at,
                 candleCount: newPost?.candle_count ?? 0,
                 flowerCount: newPost?.flower_count ?? 0,
               },
               ...prev,
             ];
           });
         }
       )
       .subscribe();
 
      return () => {
        supabase.removeChannel(channel);
      };
   }, [memorialData?.id]);

  // Reset page when memorial changes
  useEffect(() => {
    setCurrentGuestbookPage(1);
  }, [slug, token]);

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
        candleCount: acc.candleCount + (post.candleCount ?? 0),
        flowerCount: acc.flowerCount + (post.flowerCount ?? 0),
      }),
      { ripCount: 0, candleCount: 0, flowerCount: 0 }
    );
  }, [guestbookPosts]);

  const currentUserId = user?.id || "";
  const userHasPosted = guestbookPosts.some((post) => post.authorId === currentUserId);

  // Check if current user is the memorial owner
  const isOwner = user?.id === memorialData?.createdBy || false;

  const handleMemorialUpdated = () => {
    window.location.reload();
  };

  const fetchEventsAgain = async () => {
    if (!memorialData?.id || !isValidUUID(memorialData.id)) return;
    
    try {
      const { data, error } = await supabase
        .from('memorial_events')
        .select('*')
        .eq('memorial_id', memorialData.id)
        .order('event_date', { ascending: true });

      if (!error) {
        setMemorialEvents(data || []);
      }
    } catch (err) {
      console.error('Error refetching events:', err);
    }
  };

  // SEO
  useSEO({
    title: memorialData ? `Hommage à ${memorialData.name}` : undefined,
    description: memorialData?.bio,
    image: memorialData?.photos?.[memorialData?.defaultPhotoIndex || 0] || memorialData?.photos?.[0],
    type: "article",
    url: memorialData?.shareToken ? `${window.location.origin}/m/${memorialData.shareToken}` : undefined,
    deceasedName: memorialData?.name,
    age: ageAtDeath,
  });

  // Handle legacy slug redirect
  if (shouldRedirect && memorialData) {
    const redirectTarget = memorialData.shareToken 
      ? `/m/${memorialData.shareToken}` 
      : `/memorial/${memorialData.slug}`;
    return <Navigate to={redirectTarget} replace />;
  }

  // ── LOADING STATES ──
  // Show skeleton while context OR DB fallback is loading
  if (memorialsLoading || dbFallbackLoading) {
    return <MemorialSkeleton />;
  }

  // If memorial not found after both context and DB fallback, show 404
  if (!memorialData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <span className="font-serif text-3xl text-muted-foreground">F</span>
            </div>
            <h1 className="text-2xl font-serif mb-3">Espace mémoriel introuvable</h1>
            <p className="text-muted-foreground mb-6 font-sans text-sm">
              L'espace mémoriel que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = "/";
                  }
                }}
                className="btn-ghost"
              >
                ← Retour
              </button>
              <Link to="/" className="btn-memorial">
                Accueil
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── SAFE MEMORIAL OBJECT ──
  // All properties defensively accessed with fallbacks
  const canonicalUrl = memorialData?.shareToken 
    ? `${window.location.origin}/m/${memorialData.shareToken}` 
    : `${window.location.origin}/memorial/${memorialData?.slug || ''}`;

  const safePhotos = memorialData?.photos || [];
  const bestPhoto = safePhotos[memorialData?.defaultPhotoIndex || 0] || safePhotos[0] || null;
  const safeName = memorialData?.name || "Inconnu";
  const safeBio = memorialData?.bio || "";
  const safeAuthor = memorialData?.author || { id: "", name: "Créateur", relation: "Créateur de l'espace" };
  const safeGuestbookMessages = memorialData?.guestbookMessages || [];
  const safeType = memorialData?.type || "PAST";

  const memorial = {
    id: memorialData?.id || "",
    slug: memorialData?.slug || "",
    name: safeName,
    birthDate: memorialData?.birthDate || "",
    deathDate: memorialData?.deathDate || "",
    bio: safeBio,
    photos: safePhotos,
    author: safeAuthor,
    publishedAt: "Récemment",
    enableContributions: safeType === "RECENT" && (memorialData?.donationEnabled ?? true),
    funeralDate: memorialData?.funeralDate ?? null,
    funeralLocation: memorialData?.funeralLocation ?? null,
    guestbookMessages: safeGuestbookMessages,
    type: safeType,
    createdBy: memorialData?.createdBy || "",
    defaultPhotoIndex: memorialData?.defaultPhotoIndex || 0,
    shareToken: memorialData?.shareToken || null,
    isDemo: memorialData?.isDemo || false,
  };

  const handleAddCandle = async (postId: string) => {
    const post = guestbookPosts.find(p => p.id === postId);
    if (!post || (post.candleCount ?? 0) >= 10) return;

    const prevCount = post.candleCount ?? 0;
    const newCount = prevCount + 1;

    setGuestbookPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, candleCount: newCount } : p)
    );

    if (isValidUUID(postId)) {
      try {
        const { error } = await supabase
          .from('guestbook_posts')
          .update({ candle_count: newCount })
          .eq('id', postId);
        if (error) throw error;
      } catch {
        setGuestbookPosts(prev =>
          prev.map(p => p.id === postId ? { ...p, candleCount: prevCount } : p)
        );
        toast.error("Erreur lors de l'ajout du cierge");
      }
    }
  };

  const handleAddFlower = async (postId: string) => {
    const post = guestbookPosts.find(p => p.id === postId);
    if (!post || (post.flowerCount ?? 0) >= 10) return;

    const prevCount = post.flowerCount ?? 0;
    const newCount = prevCount + 1;

    setGuestbookPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, flowerCount: newCount } : p)
    );

    if (isValidUUID(postId)) {
      try {
        const { error } = await supabase
          .from('guestbook_posts')
          .update({ flower_count: newCount })
          .eq('id', postId);
        if (error) throw error;
      } catch {
        setGuestbookPosts(prev =>
          prev.map(p => p.id === postId ? { ...p, flowerCount: prevCount } : p)
        );
        toast.error("Erreur lors du dépôt de fleur");
      }
    }
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
        if (response.data?.rateLimited || response.error.message?.includes('429')) {
          toast.error(response.data?.error || "Veuillez patienter un instant avant votre prochain hommage.");
        } else {
          toast.error(response.error.message || "Erreur lors de la publication");
        }
        return;
      }

      if (response.data?.success) {
        toast.success("Votre hommage a été publié avec succès");
        await fetchGuestbookPosts();
      } else if (response.data?.rateLimited) {
        toast.error(response.data?.error || "Veuillez patienter un instant avant votre prochain hommage.");
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

  // Convert death date for anniversary component
  const deathDateISO = (() => {
    if (!memorialData?.deathDate) return "";
    try {
      const date = new Date(memorialData.deathDate);
      if (isNaN(date.getTime())) return "";
      return date.toISOString();
    } catch {
      return "";
    }
  })();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* JSON-LD Person Schema for SEO */}
      <JsonLdPerson
        name={safeName}
        birthDate={memorial.birthDate}
        deathDate={memorial.deathDate}
        description={safeBio}
        image={bestPhoto}
        url={canonicalUrl}
      />
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
        {/* Demo Guide Banner */}
        {memorial.isDemo && <DemoGuide />}

        {/* Hero Section */}
        <MemorialHero 
          memorial={{
            id: memorial.id,
            slug: memorial.slug,
            name: safeName,
            birthDate: memorial.birthDate,
            deathDate: memorial.deathDate,
            bio: safeBio,
            photos: safePhotos,
            author: safeAuthor,
            publishedAt: memorial.publishedAt,
            funeralDate: memorial.funeralDate,
            funeralLocation: memorial.funeralLocation,
            createdBy: memorial.createdBy,
            defaultPhotoIndex: memorial.defaultPhotoIndex,
            shareToken: memorial.shareToken,
            guestbookMessages: safeGuestbookMessages.map((msg: any) => ({
              authorName: msg?.authorName || "Anonyme",
              relationCategory: msg?.relationCategory || "autre",
            })),
          }}
          onScrollToGuestbook={scrollToGuestbook}
          gestureTotals={totals}
          userHasPosted={userHasPosted}
          onMemorialUpdated={handleMemorialUpdated}
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

        {/* Anniversary Reminder */}
        {deathDateISO && (
          <div className="container mx-auto px-4 pb-6">
            <div className="max-w-2xl">
              <AnniversaryReminder 
                deathDate={deathDateISO} 
                name={safeName} 
              />
            </div>
          </div>
        )}

        <div className="divider-elegant" />

        {/* Tabs Content */}
        {(() => {
          const isPastFuneral = (() => {
            if (!memorial.funeralDate) return false;
            const funeralDateTime = new Date(memorial.funeralDate);
            if (isNaN(funeralDateTime.getTime())) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return funeralDateTime.getTime() < today.getTime();
          })();
          
          const defaultTab = isPastFuneral ? "relationships" : (memorial.type === "PAST" ? "relationships" : "notice");
          return (
        <section className="container mx-auto px-4 py-12">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto mb-8 overflow-x-auto flex-nowrap">
              {memorial.type !== "PAST" && (
                <TabsTrigger
                  value="notice"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Avis de décès</span>
                  <span className="sm:hidden">Avis</span>
                </TabsTrigger>
              )}
              
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

            {memorial.type !== "PAST" && (
              <TabsContent value="notice" className="mt-0">
                <div className="max-w-2xl space-y-6">
                   {isOwner && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap justify-end gap-3">
                        <EditMemorialDialog
                          memorialId={memorial.id}
                          initialData={{
                            bio: safeBio,
                            funeralDate: memorial.funeralDate,
                            funeralLocation: memorial.funeralLocation,
                            photos: safePhotos,
                            defaultPhotoIndex: memorial.defaultPhotoIndex,
                          }}
                          onSave={handleMemorialUpdated}
                        />
                        <AddEventDialog
                          memorialId={memorial.id}
                          onEventAdded={fetchEventsAgain}
                        />
                        <RequestLinkDialog
                          memorialId={memorial.id}
                          memorialName={safeName}
                        />
                      </div>
                      <InferredLinkSuggestions
                        memorialId={memorial.id}
                        memorialName={safeName}
                      />
                    </div>
                  )}
                  
                  <DeathNotice
                    memorial={{
                      name: safeName,
                      birthDate: memorial.birthDate,
                      deathDate: memorial.deathDate,
                      bio: safeBio,
                      funeralDate: memorial.funeralDate,
                      funeralLocation: memorial.funeralLocation,
                    }}
                    events={memorialEvents}
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent value="gatherings" className="mt-0">
              <div className="max-w-2xl">
                <GatheringsCalendar
                  events={memorialEvents}
                  memorialName={safeName}
                  memorialId={memorial.id}
                  isOwner={isOwner}
                  onAddEvent={fetchEventsAgain}
                />
              </div>
            </TabsContent>

            <TabsContent value="relationships" className="mt-0">
              <div className="max-w-3xl space-y-6">
                {isOwner && (
                  <TransitiveDiscoveryWidget
                    memorialId={memorial.id}
                    memorialName={safeName}
                  />
                )}
                <SecureDataDisplay blurPreview>
                  <RelationshipMaillage 
                    deceasedName={safeName}
                    memorialId={memorial.id}
                    posts={guestbookPosts.map(post => ({
                      authorId: post.authorId,
                      authorName: post?.authorName || "Anonyme",
                      relationCategory: post?.relationCategory || "autre",
                    }))}
                  />
                </SecureDataDisplay>
              </div>
            </TabsContent>

            {memorial.enableContributions && contributionsEnabled && (
              <TabsContent value="contributions" className="mt-0">
                <div className="max-w-2xl">
                  <ContributionLink deceasedName={safeName} />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </section>
          );
        })()}

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

              <div ref={guestbookFormRef}>
                <GuestbookForm memorialId={memorialData?.id || ""} onSubmit={handleSubmitPost} />
              </div>

              <div className="divide-y divide-memorial-dark-muted/20 mt-8">
              {paginatedPosts.map((post) => (
                  <GuestbookPost
                    key={post.id}
                    post={post}
                    isOwner={post.authorId === currentUserId}
                    onAddCandle={handleAddCandle}
                    onAddFlower={handleAddFlower}
                  />
                ))}
              </div>

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

/** Wrapped with ErrorBoundary to prevent white-screen crashes */
const Memorial = () => (
  <MemorialErrorBoundary>
    <MemorialInner />
  </MemorialErrorBoundary>
);

export default Memorial;
