import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface Notification {
  id: string;
  type: "NEW_MESSAGE" | "NEW_EVENT" | "MEMORIAL_UPDATE";
  memorialSlug: string;
  memorialName: string;
  message: string;
  createdAt: string;
  isRead: boolean;
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
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followedMemorials, setFollowedMemorials] = useState<FollowedMemorial[]>([]);

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setFollowedMemorials([]);
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
          // Unfollow
          return prev.filter((m) => m.slug !== memorial.slug);
        } else {
          // Follow
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
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        followedMemorials,
        unreadCount,
        isFollowing,
        toggleFollow,
        markAsRead,
        markAllAsRead,
        clearNotifications,
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
