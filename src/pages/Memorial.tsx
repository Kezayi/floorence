import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDemoAvatarUrl } from "@/lib/demoAvatars";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
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
import PendingPaymentBanner from "@/components/memorial/PendingPaymentBanner";
import GuestbookPost, { GuestbookPostData } from "@/components/memorial/GuestbookPost";
import GuestbookForm from "@/components/memorial/GuestbookForm";
import GesteRituelModal from "@/components/memorial/GesteRituelModal";
import RelationshipMaillage from "@/components/memorial/RelationshipMaillage";
import LineageTree from "@/components/memorial/LineageTree";
import SecureDataDisplay from "@/components/memorial/SecureDataDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ChevronLeft, Calendar, Book, GitBranch, TreePine, Link2 } from "lucide-react";
import { useMemorials } from "@/contexts/MemorialsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { inferGender } from "@/lib/genderInference";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useMonetization } from "@/hooks/useMonetization";
import { useSEO } from "@/hooks/useSEO";
import { useTabPrefetch } from "@/hooks/useTabPrefetch";
import { useInView } from "react-intersection-observer";
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
  const navigate = useNavigate();
  const historicalRedirectRef = useRef(false);
  
  const [memorialEvents, setMemorialEvents] = useState<MemorialEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { data: settings } = useSystemSettings();
  const { data: monetization, refetch: refetchMonetization } = useMonetization();
  const isMonetized = monetization?.isMonetized ?? false;
  const POSTS_PER_PAGE = 5;
  const [hommagesPage, setHommagesPage] = useState(1);
  const [activeTab, setActiveTab] = useState("hommages");
  // Gesture modal state
  const [gesteModal, setGesteModal] = useState<{ open: boolean; itemType: "cierge" | "fleur"; postId: string }>({
    open: false, itemType: "cierge", postId: "",
  });

  // ── DB Fallback State ──
  // When memorial not found in context, query DB directly to prevent false 404s
  const [dbFallback, setDbFallback] = useState<any>(null);
  const [dbFallbackLoading, setDbFallbackLoading] = useState(false);
  const [dbFallbackDone, setDbFallbackDone] = useState(false);

  // Reset DB fallback state when route params change (critical for client-side navigation)
  useEffect(() => {
    setDbFallback(null);
    setDbFallbackDone(false);
    setDbFallbackLoading(false);
    historicalRedirectRef.current = false;
  }, [token, slug]);
  
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
          .from('v_public_memorials')
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
          // M2.4B — historical link of a source notice associated to a Master.
          // Source must be public (published, active, not deleted via view); only the direct Master is resolved.
          let srcQuery = supabase
            .from('v_public_memorials')
            .select('id, merged_into')
            .eq('is_published', true)
            .eq('is_active', true)
            .not('merged_into', 'is', null);
          srcQuery = token
            ? srcQuery.eq('share_token', token)
            : srcQuery.or(`slug.eq.${slug},legacy_slug.eq.${slug}`);
          const { data: src } = await srcQuery.maybeSingle();
          if (src?.merged_into && src.merged_into !== src.id && !historicalRedirectRef.current) {
            const { data: master } = await supabase
              .from('v_public_memorials')
              .select('id, share_token')
              .eq('id', src.merged_into)
              .eq('is_published', true)
              .eq('is_active', true)
              .is('merged_into', null)
              .maybeSingle();
            if (master?.share_token && master.share_token !== token) {
              historicalRedirectRef.current = true;
              navigate(`/m/${master.share_token}`, { replace: true });
              return;
            }
          }
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
  
  // State for locked relation (user's first post relation on this memorial)
  const [userLockedRelation, setUserLockedRelation] = useState<{ link: string; category: string } | undefined>(undefined);

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
        const isDemo = memorialData?.isDemo === true;
        const posts: GuestbookPostData[] = (data || []).map((post: any) => {
          // For real memorials (12th+), use the actual author_photo_url from profiles
          // For demo memorials (first 11), use deterministic demo avatars
          const avatarUrl = isDemo
            ? (post.author_name ? getDemoAvatarUrl(post.author_name) : null)
            : (post.author_photo_url || null);

          return {
            id: post.id,
            memorialId: post.memorial_id,
            authorId: post.user_id
              ? `author-${post.user_id}`
              : (post.author_name ? `author-${post.author_name.trim().toLowerCase().replace(/\s+/g, '-')}` : `anon-${post.id}`),
            authorUserId: post.user_id || null,
            authorName: post.author_name || 'Anonyme',
            authorAvatarUrl: avatarUrl,
            relationCategory: post.relation_category || 'autre',
            relationLink: post.relation_link || null,
            content: post.content || '',
            photos: post.photos || [],
            createdAt: post.created_at,
            candleCount: post.candle_count ?? 0,
            flowerCount: post.flower_count ?? 0,
          };
        });
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

  // Consolidated tribute authors for the maillage (Master + authorized source memorials).
  // Read-only: same public visibility rules as get_public_guestbook_posts (hidden/trashed excluded).
  const memorialIdForMaillage = memorialData?.id;
  const isMaillageUUID = !!memorialIdForMaillage && isValidUUID(memorialIdForMaillage);
  const { data: maillagePosts } = useQuery({
    queryKey: ["maillage-posts-consolidated", memorialIdForMaillage],
    enabled: isMaillageUUID,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_public_guestbook_posts_consolidated", { p_master_id: memorialIdForMaillage as string });
      if (error) {
        console.error("Error fetching consolidated maillage posts:", error);
        return [];
      }
      const isDemo = memorialData?.isDemo === true;
      return (data || []).map((post: any) => ({
        authorId: post.user_id
          ? `author-${post.user_id}`
          : (post.author_name ? `author-${post.author_name.trim().toLowerCase().replace(/\s+/g, "-")}` : `anon-${post.id}`),
        authorName: post.author_name || "Anonyme",
        authorAvatarUrl: isDemo
          ? (post.author_name ? getDemoAvatarUrl(post.author_name) : null)
          : (post.author_photo_url || null),
        relationCategory: post.relation_category || "autre",
        relationLink: post.relation_link || null,
      }));
    },
  });

  // Fetch user's locked relation (first post on this memorial)
  useEffect(() => {
    if (!user?.id || !memorialData?.id || !isValidUUID(memorialData.id)) {
      setUserLockedRelation(undefined);
      return;
    }
    const fetchLockedRelation = async () => {
      const { data } = await supabase
        .from('guestbook_posts')
        .select('relation_category, relation_link')
        .eq('memorial_id', memorialData.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (data?.relation_link) {
        setUserLockedRelation({ link: data.relation_link, category: data.relation_category });
      } else {
        setUserLockedRelation(undefined);
      }
    };
    fetchLockedRelation();
  }, [user?.id, memorialData?.id]);
 
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
             
              const isDemo = memorialData?.isDemo === true;
              return [
                {
                   id: newPost?.id,
                   authorId: newPost?.user_id
                     ? `author-${newPost.user_id}`
                     : (newPost?.author_name ? `author-${newPost.author_name.trim().toLowerCase().replace(/\s+/g, '-')}` : `anon-${newPost?.id}`),
                   authorUserId: newPost?.user_id || null,
                   authorName: newPost?.author_name || 'Anonyme',
                  authorAvatarUrl: isDemo
                    ? (newPost?.author_name ? getDemoAvatarUrl(newPost.author_name) : null)
                    : (newPost?.author_photo_url || null),
                  relationCategory: newPost?.relation_category || 'autre',
                  relationLink: newPost?.relation_link || null,
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
    setHommagesPage(1);
    setActiveTab("hommages");
  }, [slug, token]);

  // Paginated posts
  const totalHommagesPages = Math.ceil(guestbookPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const start = (hommagesPage - 1) * POSTS_PER_PAGE;
    return guestbookPosts.slice(start, start + POSTS_PER_PAGE);
  }, [guestbookPosts, hommagesPage]);

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
  const userHasPosted = guestbookPosts.some((post) => post.authorUserId === currentUserId);

  const isOwner = user?.id === memorialData?.createdBy || false;
  const { prefetchTab } = useTabPrefetch(memorialData?.id || "");

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
  if (memorialsLoading || dbFallbackLoading || (!contextMemorial && !dbFallback && !dbFallbackDone)) {
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




  const openGesteModal = (postId: string, itemType: "cierge" | "fleur") => {
    setGesteModal({ open: true, itemType, postId });
  };

  const handleGesteConfirm = async (phone?: string) => {
    const { postId, itemType } = gesteModal;
    const post = guestbookPosts.find(p => p.id === postId);
    if (!post) return;

    const countKey = itemType === "cierge" ? "candleCount" : "flowerCount";
    if ((post[countKey] ?? 0) >= 10) return;

    const prevCount = post[countKey] ?? 0;

    // Optimistic update for free mode
    setGuestbookPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, [countKey]: prevCount + 1 } : p)
    );

    if (isValidUUID(postId)) {
      try {
        const deceasedFullName = memorialData
          ? `${memorialData.firstName} ${memorialData.lastName}`.trim()
          : memorial.name;
        const { data, error } = await supabase.functions.invoke('ebilling', {
          body: {
            memorial_id: memorial.id,
            item_type: itemType,
            quantity: 1,
            post_id: postId,
            deceased_name: deceasedFullName,
            ...(phone ? { phone } : {}),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const label = itemType === "cierge" ? "Cierge allumé" : "Fleur déposée";
        toast.success(`${label} avec succès`);
      } catch (err: any) {
        // Rollback
        setGuestbookPosts(prev =>
          prev.map(p => p.id === postId ? { ...p, [countKey]: prevCount } : p)
        );
        toast.error(err.message || "Erreur lors du geste");
      }
    }
  };

  const handleAddCandle = (postId: string) => openGesteModal(postId, "cierge");
  const handleAddFlower = (postId: string) => openGesteModal(postId, "fleur");

  const handleSubmitPost = async (data: {
    content: string;
    relationCategory: string;
    relationLink: string;
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
        authorId: `author-${user.id}`,
        authorUserId: user.id,
        authorName: user.user_metadata?.full_name || user.email?.split('@')[0] || "Utilisateur",
        relationCategory: data.relationCategory,
        relationLink: data.relationLink,
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
          relationLink: data.relationLink,
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
        // Success — the form's own success modal handles the user feedback
        await fetchGuestbookPosts();
        const createdPostId: string | undefined = response.data?.postId;
        // Notify followers (fire and forget)
        supabase.functions.invoke('notify-followers', {
          body: {
            memorial_id: memorialData.id,
            type: "NEW_MESSAGE",
            title: memorial.name,
            message: `Nouvel hommage déposé pour ${memorial.name}`,
          },
        }).catch(() => {});
        return { success: true, postId: createdPostId };
      } else if (response.data?.rateLimited) {
        toast.error(response.data?.error || "Veuillez patienter un instant avant votre prochain hommage.");
      } else {
        toast.error(response.data?.error || "Erreur lors de la publication");
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error("Une erreur est survenue lors de la publication");
    }
    return { success: false };
  };

  const scrollToGuestbook = () => {
    setActiveTab("hommages");
    requestAnimationFrame(() => guestbookFormRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const scrollToDarkZone = () => {
    setActiveTab("hommages");
    requestAnimationFrame(() => document.getElementById("memorial-tabs")?.scrollIntoView({ behavior: "smooth" }));
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

        {/* Tabs Content — NAV-P1 : Hommage · Maillage · Lignage · Inférences · Événements */}
        {(() => {
          // NAV-P1-C : l'avis de décès et les actions du créateur ne dépendent plus de la date des obsèques.
          // Les événements à venir restent filtrés par GatheringsCalendar ; publication/confidentialité inchangées.
          return (
        <section id="memorial-tabs" className="container mx-auto px-4 pt-6 pb-16 md:pt-10 md:pb-20 scroll-mt-20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList aria-label="Sections du mémorial" className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto mb-8 overflow-x-auto overflow-y-hidden flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="hommages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-champagne data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-medium text-muted-foreground px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Heart className="w-4 h-4" aria-hidden="true" />
                <span>Hommage</span>
              </TabsTrigger>
              <TabsTrigger value="relationships" onMouseEnter={() => prefetchTab("relationships")} className="rounded-none border-b-2 border-transparent data-[state=active]:border-champagne data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-medium text-muted-foreground px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <GitBranch className="w-4 h-4" aria-hidden="true" />
                <span>Maillage</span>
              </TabsTrigger>
              <TabsTrigger value="lineage" onMouseEnter={() => prefetchTab("lineage")} className="rounded-none border-b-2 border-transparent data-[state=active]:border-champagne data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-medium text-muted-foreground px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <TreePine className="w-4 h-4" aria-hidden="true" />
                <span>Lignage</span>
              </TabsTrigger>
              <TabsTrigger value="inferences" className="rounded-none border-b-2 border-transparent data-[state=active]:border-champagne data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-medium text-muted-foreground px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Link2 className="w-4 h-4" aria-hidden="true" />
                <span>Inférences</span>
              </TabsTrigger>
              <TabsTrigger value="gatherings" onMouseEnter={() => prefetchTab("gatherings")} className="rounded-none border-b-2 border-transparent data-[state=active]:border-champagne data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-medium text-muted-foreground px-4 md:px-6 py-3 font-sans flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>Événements</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hommages" className="mt-0 premium-panel">
              <div className="max-w-2xl space-y-12">
                {guestbookPosts.length > 0 && (
                <div>
              <div className="flex items-center gap-3 mb-2">
                <Heart className="w-6 h-6 text-livreor-foreground" />
                <h2 className="text-livreor-foreground">Hommages</h2>
              </div>
              <p className="font-serif mb-1 text-livreor-muted">
                Les témoignages de ceux qui ont connu {safeName}
              </p>
              <p className="text-xs mb-8 font-sans text-livreor-muted/70">
                {guestbookPosts.length} hommage{guestbookPosts.length > 1 ? "s" : ""}
              </p>

              <div className="space-y-0">
                {paginatedPosts.map((post, index) => (
                  <div key={post.id}>
                    <GuestbookPost
                      post={post}
                      isOwner={post.authorUserId === currentUserId}
                      deceasedGender={inferGender(memorialData?.name?.split(" ")[0] || "")}
                      onAddCandle={handleAddCandle}
                      onAddFlower={handleAddFlower}
                      deceasedName={memorialData?.name}
                    />
                    {/* Arabesque separator between posts */}
                    {index < paginatedPosts.length - 1 && (
                      <div className="flex items-center justify-center gap-3 py-1" aria-hidden="true">
                        <span className="h-px flex-1 bg-livreor-muted/25" />
                        <span className="text-livreor-muted/35 text-sm font-serif select-none tracking-widest">✦ ✦ ✦</span>
                        <span className="h-px flex-1 bg-livreor-muted/25" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Hommages — 5 par page */}
              {totalHommagesPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border">
                  <button
                    onClick={() => setHommagesPage(p => Math.max(1, p - 1))}
                    disabled={hommagesPage === 1}
                    className="px-4 py-2 text-sm font-sans rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-livreor-foreground hover:bg-livreor-foreground/10"
                  >
                    ← Précédent
                  </button>
                  <span className="text-sm font-sans text-livreor-muted">
                    {hommagesPage} / {totalHommagesPages}
                  </span>
                  <button
                    onClick={() => setHommagesPage(p => Math.min(totalHommagesPages, p + 1))}
                    disabled={hommagesPage === totalHommagesPages}
                    className="px-4 py-2 text-sm font-sans rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-livreor-foreground hover:bg-livreor-foreground/10"
                  >
                    Suivant →
                  </button>
                </div>
              )}
                </div>
                )}

                <div>
              <div className="flex items-center gap-3 mb-2">
                <Book className="w-6 h-6 text-livreor-foreground" />
                <h2 className="text-livreor-foreground">Livre d'or</h2>
              </div>
              <p className="font-serif mb-8 text-livreor-muted">
                Partagez un souvenir ou un message de soutien à la famille
              </p>

              {memorialData?.id && <PendingPaymentBanner memorialId={memorialData.id} onPaymentConfirmed={fetchGuestbookPosts} />}

              <div ref={guestbookFormRef}>
                <GuestbookForm
                  memorialId={memorialData?.id || ""}
                  defuntName={memorialData ? `${memorialData.first_name} ${memorialData.last_name}` : undefined}
                  onSubmit={handleSubmitPost}
                  lockedRelation={userLockedRelation}
                />
              </div>
                </div>

                {memorial.enableContributions && contributionsEnabled && (
                  <ContributionLink deceasedName={safeName} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="relationships" className="mt-0 premium-panel">
              <div className="max-w-3xl space-y-6">
                {isOwner && (
                  <TransitiveDiscoveryWidget memorialId={memorial.id} memorialName={safeName} />
                )}
                <SecureDataDisplay blurPreview>
                  <RelationshipMaillage
                    section="graph"
                    deceasedName={safeName}
                    memorialId={memorial.id}
                    posts={(isMaillageUUID && maillagePosts ? maillagePosts : guestbookPosts.map(post => ({
                      authorId: post.authorId,
                      authorName: post?.authorName || "Anonyme",
                      authorAvatarUrl: post?.authorAvatarUrl || null,
                      relationCategory: post?.relationCategory || "autre",
                      relationLink: post?.relationLink || null,
                    })))}
                  />
                </SecureDataDisplay>
              </div>
            </TabsContent>

            <TabsContent value="lineage" className="mt-0 premium-panel">
              <div className="max-w-3xl">
                <LineageTree
                  memorialId={memorial.id}
                  deceasedName={safeName}
                  deceasedPhoto={bestPhoto}
                  isOwner={isOwner}
                />
              </div>
            </TabsContent>

            <TabsContent value="inferences" className="mt-0 premium-panel">
              <div className="max-w-3xl">
                <SecureDataDisplay blurPreview>
                  <RelationshipMaillage
                    section="inferences"
                    deceasedName={safeName}
                    memorialId={memorial.id}
                    posts={(isMaillageUUID && maillagePosts ? maillagePosts : guestbookPosts.map(post => ({
                      authorId: post.authorId,
                      authorName: post?.authorName || "Anonyme",
                      authorAvatarUrl: post?.authorAvatarUrl || null,
                      relationCategory: post?.relationCategory || "autre",
                      relationLink: post?.relationLink || null,
                    })))}
                  />
                </SecureDataDisplay>
              </div>
            </TabsContent>

            <TabsContent value="gatherings" className="mt-0 premium-panel">
              <div className="mb-10">
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
                            memorialId: memorial.id,
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
              </div>
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

          </Tabs>
        </section>
          );
        })()}
      </main>

      <Footer />

      {/* Gesture Ritual Modal */}
      <GesteRituelModal
        open={gesteModal.open}
        onOpenChange={(open) => setGesteModal(prev => ({ ...prev, open }))}
        itemType={gesteModal.itemType}
        postId={gesteModal.postId}
        onConfirm={handleGesteConfirm}
      />
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
