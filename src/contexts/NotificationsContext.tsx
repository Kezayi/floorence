import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  type: "NEW_MESSAGE" | "NEW_EVENT" | "MEMORIAL_UPDATE" | "LINK_REQUEST" | "SUGGESTED_LINK";
  memorialSlug: string;
  memorialName: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  linkRequestId?: string;
  sourceMemorialName?: string;
  relationType?: string;
}

export interface FollowedMemorial {
  id: string;
  slug: string;
  name: string;
  photoUrl: string;
  followedAt: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  followedMemorials: FollowedMemorial[];
  unreadCount: number;
  isFollowing: (memorialSlug: string) => boolean;
  toggleFollow: (memorial: { slug: string; name: string; photoUrl: string }) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  acceptLinkRequest: (requestId: string) => Promise<void>;
  rejectLinkRequest: (requestId: string) => Promise<void>;
  pendingLinkRequests: number;
  pendingSuggestions: number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followedMemorials, setFollowedMemorials] = useState<FollowedMemorial[]>([]);
  const [dismissedRequests, setDismissedRequests] = useState<Set<string>>(new Set());

  // Shared query: user's own memorials (deduplicated — was fetched 3x before)
  const { data: myMemorials } = useQuery({
    queryKey: ["user-my-memorials", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, slug")
        .or(`created_by.eq.${user.id},heir_user_id.eq.${user.id}`);
      return data || [];
    },
  });

  const myIds = useMemo(() => (myMemorials || []).map((m) => m.id), [myMemorials]);

  // Fetch pending link requests (uses shared myMemorials)
  const { data: linkRequests } = useQuery({
    queryKey: ["pending-link-requests", user?.id],
    enabled: !!user && myIds.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      if (!user || myIds.length === 0) return [];

      const { data: pending } = await supabase
        .from("memorial_relations")
        .select("id, memorial_id_1, memorial_id_2, relation_type, relationship_type, requested_by, status")
        .eq("status", "pending")
        .in("memorial_id_2", myIds);

      if (!pending || pending.length === 0) return [];

      const sourceIds = pending.map((p) => p.memorial_id_1).filter(Boolean) as string[];
      const { data: sourceMemorials } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, slug")
        .in("id", sourceIds);

      const sourceMap = new Map<string, { name: string; slug: string }>();
      (sourceMemorials || []).forEach((m) => {
        sourceMap.set(m.id, { name: `${m.first_name} ${m.last_name}`, slug: m.slug });
      });

      const targetMap = new Map<string, { name: string; slug: string }>();
      (myMemorials || []).forEach((m) => {
        targetMap.set(m.id, { name: `${m.first_name} ${m.last_name}`, slug: m.slug });
      });

      return pending.map((req) => {
        const source = sourceMap.get(req.memorial_id_1 || "") || { name: "Inconnu", slug: "" };
        const target = targetMap.get(req.memorial_id_2 || "") || { name: "Inconnu", slug: "" };
        return {
          id: req.id,
          sourceMemorialName: source.name,
          sourceSlug: source.slug,
          targetMemorialName: target.name,
          targetSlug: target.slug,
          relationType: req.relationship_type || req.relation_type,
        };
      });
    },
  });

  // Fetch pending suggested links count (uses shared myIds)
  const { data: suggestedLinksCount = 0 } = useQuery({
    queryKey: ["pending-suggested-links-count", user?.id],
    enabled: !!user && myIds.length > 0,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user || myIds.length === 0) return 0;

      const { count, error } = await supabase
        .from("suggested_links")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .or(`source_memorial_id.in.(${myIds.join(",")}),target_memorial_id.in.(${myIds.join(",")})`);

      if (error) return 0;
      return count || 0;
    },
  });

  // Convert link requests to notifications
  const linkRequestNotifications: Notification[] = (linkRequests || [])
    .filter((req) => !dismissedRequests.has(req.id))
    .map((req) => ({
      id: `link-${req.id}`,
      type: "LINK_REQUEST" as const,
      memorialSlug: req.targetSlug,
      memorialName: req.targetMemorialName,
      message: `${req.sourceMemorialName} souhaite être relié à ${req.targetMemorialName} en tant que "${req.relationType}"`,
      createdAt: new Date().toISOString(),
      isRead: false,
      linkRequestId: req.id,
      sourceMemorialName: req.sourceMemorialName,
      relationType: req.relationType,
    }));

  const suggestedLinkNotifications: Notification[] = suggestedLinksCount > 0
    ? [{
        id: "suggested-links-summary",
        type: "SUGGESTED_LINK" as const,
        memorialSlug: "",
        memorialName: "",
        message: `${suggestedLinksCount} nouveau${suggestedLinksCount > 1 ? "x" : ""} lien${suggestedLinksCount > 1 ? "s" : ""} potentiel${suggestedLinksCount > 1 ? "s" : ""} détecté${suggestedLinksCount > 1 ? "s" : ""}. Venez confirmer votre lignée.`,
        createdAt: new Date().toISOString(),
        isRead: false,
      }]
    : [];

  const allNotifications = [...suggestedLinkNotifications, ...linkRequestNotifications, ...notifications];

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setFollowedMemorials([]);
      setDismissedRequests(new Set());
    }
  }, [user]);

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const pendingLinkRequests = linkRequestNotifications.length;

  const isFollowing = useCallback(
    (memorialSlug: string) => followedMemorials.some((m) => m.slug === memorialSlug),
    [followedMemorials]
  );

  const toggleFollow = useCallback(
    (memorial: { slug: string; name: string; photoUrl: string }) => {
      setFollowedMemorials((prev) => {
        const isCurrentlyFollowing = prev.some((m) => m.slug === memorial.slug);
        if (isCurrentlyFollowing) {
          return prev.filter((m) => m.slug !== memorial.slug);
        } else {
          return [...prev, {
            id: `f-${Date.now()}`,
            slug: memorial.slug,
            name: memorial.name,
            photoUrl: memorial.photoUrl,
            followedAt: new Date().toISOString(),
          }];
        }
      });
    },
    []
  );

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setDismissedRequests((prev) => {
      const next = new Set(prev);
      (linkRequests || []).forEach((req) => next.add(req.id));
      return next;
    });
  }, [linkRequests]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const acceptLinkRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from("memorial_relations")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) throw error;

    setDismissedRequests((prev) => new Set(prev).add(requestId));
    queryClient.invalidateQueries({ queryKey: ["pending-link-requests"] });
    queryClient.invalidateQueries({ queryKey: ["community-graph-memorial-relations"] });
  }, [queryClient]);

  const rejectLinkRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from("memorial_relations")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) throw error;

    setDismissedRequests((prev) => new Set(prev).add(requestId));
    queryClient.invalidateQueries({ queryKey: ["pending-link-requests"] });
  }, [queryClient]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications: allNotifications,
        followedMemorials,
        unreadCount,
        isFollowing,
        toggleFollow,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        acceptLinkRequest,
        rejectLinkRequest,
        pendingLinkRequests,
        pendingSuggestions: suggestedLinksCount,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
};
