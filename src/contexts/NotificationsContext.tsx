import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  type: "NEW_MESSAGE" | "NEW_EVENT" | "MEMORIAL_UPDATE" | "LINK_REQUEST";
  memorialSlug: string;
  memorialName: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  // Extra data for LINK_REQUEST
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
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followedMemorials, setFollowedMemorials] = useState<FollowedMemorial[]>([]);
  const [dismissedRequests, setDismissedRequests] = useState<Set<string>>(new Set());

  // Fetch pending link requests targeting the current user's memorials
  const { data: linkRequests } = useQuery({
    queryKey: ["pending-link-requests", user?.id],
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      if (!user) return [];

      // Get memorials owned by current user
      const { data: myMemorials } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, slug")
        .or(`created_by.eq.${user.id},heir_user_id.eq.${user.id}`);

      if (!myMemorials || myMemorials.length === 0) return [];

      const myIds = myMemorials.map((m) => m.id);

      // Get pending requests where one of my memorials is the target (memorial_id_2)
      const { data: pending } = await supabase
        .from("memorial_relations")
        .select("id, memorial_id_1, memorial_id_2, relation_type, requested_by, status")
        .eq("status", "pending")
        .in("memorial_id_2", myIds);

      if (!pending || pending.length === 0) return [];

      // Get source memorial names
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
      myMemorials.forEach((m) => {
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

  const allNotifications = [...linkRequestNotifications, ...notifications];

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
    (memorialSlug: string) => {
      return followedMemorials.some((m) => m.slug === memorialSlug);
    },
    [followedMemorials]
  );

  const toggleFollow = useCallback(
    (memorial: { slug: string; name: string; photoUrl: string }) => {
      setFollowedMemorials((prev) => {
        const isCurrentlyFollowing = prev.some((m) => m.slug === memorial.slug);
        if (isCurrentlyFollowing) {
          return prev.filter((m) => m.slug !== memorial.slug);
        } else {
          const newFollow: FollowedMemorial = {
            id: `f-${Date.now()}`,
            slug: memorial.slug,
            name: memorial.name,
            photoUrl: memorial.photoUrl,
            followedAt: new Date().toISOString(),
          };
          return [...prev, newFollow];
        }
      });
    },
    []
  );

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    // Mark link request notifications as dismissed (read)
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

    if (error) {
      console.error("Error accepting link request:", error);
      throw error;
    }

    // Remove from dismissed and refetch
    setDismissedRequests((prev) => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["pending-link-requests"] });
    queryClient.invalidateQueries({ queryKey: ["community-graph-memorial-relations"] });
  }, [queryClient]);

  const rejectLinkRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from("memorial_relations")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      console.error("Error rejecting link request:", error);
      throw error;
    }

    setDismissedRequests((prev) => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
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
