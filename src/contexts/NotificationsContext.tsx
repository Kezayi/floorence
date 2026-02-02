import { createContext, useContext, useState, ReactNode, useCallback } from "react";

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

// Mock initial data
const mockNotifications: Notification[] = [
  {
    id: "n1",
    type: "NEW_MESSAGE",
    memorialSlug: "marcus-james-washington",
    memorialName: "Marcus James Washington",
    message: "Un nouveau message a été publié dans le livre d'or",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
  },
  {
    id: "n2",
    type: "NEW_EVENT",
    memorialSlug: "gloria-mae-johnson",
    memorialName: "Gloria Mae Johnson",
    message: "Un nouveau recueillement a été programmé",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    isRead: false,
  },
  {
    id: "n3",
    type: "MEMORIAL_UPDATE",
    memorialSlug: "jaylen-christopher-davis",
    memorialName: "Jaylen Christopher Davis",
    message: "L'espace mémoriel a été mis à jour",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
  },
];

const mockFollowedMemorials: FollowedMemorial[] = [
  {
    id: "f1",
    slug: "marcus-james-washington",
    name: "Marcus James Washington",
    photoUrl: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&h=100&fit=crop&crop=face",
    followedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "f2",
    slug: "gloria-mae-johnson",
    name: "Gloria Mae Johnson",
    photoUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face",
    followedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [followedMemorials, setFollowedMemorials] = useState<FollowedMemorial[]>(mockFollowedMemorials);

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
