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
  toggleFollow: (memorial: { slug: string; name: string; photoUrl: string; id: string }) => void;
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
  const [dismissedRequests, setDismissedRequests] = useState<Set<string>>(new Set());

  // Shared query: user's own memorials
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

  // Fetch DB follows
  const { data: dbFollows } = useQuery({
    queryKey: ["memorial-follows", user?.id],
    enabled: !!user,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("memorial_follows")
        .select("id, memorial_id, created_at, memorials:memorial_id (first_name, last_name, slug, photo_url)")
        .eq("user_id", user.id);
      return (data || []).map((f: any) => ({
        id: f.id,
        slug: f.memorials?.slug || "",
        name: `${f.memorials?.first_name || ""} ${f.memorials?.last_name || ""}`.trim(),
        photoUrl: f.memorials?.photo_url || "",
        followedAt: f.created_at,
        memorialId: f.memorial_id,
      }));
    },
  });

  const followedMemorials: FollowedMemorial[] = dbFollows || [];

  // Fetch DB notifications
  const { data: dbNotifications } = useQuery({
    queryKey: ["user-notifications", user?.id],
    enabled: !!user,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_notifications")
        .select("id, type, memorial_id, title, message, is_read, created_at, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((n: any) => ({
        id: n.id,
        type: n.type as Notification["type"],
        memorialSlug: "",
        memorialName: n.title,
        message: n.message,
        createdAt: n.created_at,
        isRead: n.is_read,
      }));
    },
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-notifications", user.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Fetch pending link requests
  const { data: linkRequests } = useQuery({
    queryKey: ["pending-link-requests", user?.id],
    enabled: !!user && myIds.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      if (!user || myIds.length === 0) return [];
      const { data: pending } = await supabase
        .from("memorial_relations")
        .select("id, memorial_id_1, memorial_id_2, relation_type, requested_by, status")
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
          relationType: req.relation_type,
        };
      });
    },
  });

  // Fetch pending suggested links count
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

  const allNotifications = [
    ...suggestedLinkNotifications,
    ...linkRequestNotifications,
    ...(dbNotifications || []),
  ];

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const pendingLinkRequests = linkRequestNotifications.length;

  const isFollowing = useCallback(
    (memorialSlug: string) => followedMemorials.some((m) => m.slug === memorialSlug),
    [followedMemorials]
  );

  const toggleFollow = useCallback(
    async (memorial: { slug: string; name: string; photoUrl: string; id: string }) => {
      if (!user) return;
      const existing = followedMemorials.find((m) => m.slug === memorial.slug);
      if (existing) {
        await supabase.from("memorial_follows").delete().eq("user_id", user.id).eq("memorial_id", memorial.id);
      } else {
        await supabase.from("memorial_follows").insert({ user_id: user.id, memorial_id: memorial.id });
      }
      queryClient.invalidateQueries({ queryKey: ["memorial-follows", user.id] });
    },
    [user, followedMemorials, queryClient]
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    if (notificationId.startsWith("link-") || notificationId === "suggested-links-summary") return;
    await supabase.from("user_notifications").update({ is_read: true }).eq("id", notificationId);
    queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
  }, [queryClient]);

  const markAllAsRead = useCallback(async () => {
    if (user) {
      await supabase.from("user_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    }
    setDismissedRequests((prev) => {
      const next = new Set(prev);
      (linkRequests || []).forEach((req) => next.add(req.id));
      return next;
    });
  }, [user, linkRequests, queryClient]);

  const clearNotifications = useCallback(() => {
    // Only clears dismissed state for link requests
    setDismissedRequests(new Set());
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
