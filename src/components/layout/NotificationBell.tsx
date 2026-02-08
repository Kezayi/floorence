import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Trash2, MessageCircle, Calendar, RefreshCw, Link2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const notificationIcons = {
  NEW_MESSAGE: MessageCircle,
  NEW_EVENT: Calendar,
  MEMORIAL_UPDATE: RefreshCw,
  LINK_REQUEST: Link2,
  SUGGESTED_LINK: Sparkles,
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, acceptLinkRequest, rejectLinkRequest } = useNotifications();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  const handleAccept = async (requestId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProcessingIds((prev) => new Set(prev).add(requestId));
    try {
      await acceptLinkRequest(requestId);
      toast.success("Lien accepté ! Le Pont des Ancêtres est maintenant visible dans le graphe.");
    } catch {
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProcessingIds((prev) => new Set(prev).add(requestId));
    try {
      await rejectLinkRequest(requestId);
      toast.info("Demande de liaison refusée.");
    } catch {
      toast.error("Erreur lors du refus");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-sans font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-sans font-medium text-sm">Notifications</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Tout lire
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
               const Icon = notificationIcons[notification.type];
               const isLinkRequest = notification.type === "LINK_REQUEST";
               const isSuggestedLink = notification.type === "SUGGESTED_LINK";
               const isProcessing = notification.linkRequestId
                 ? processingIds.has(notification.linkRequestId)
                 : false;

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 border-b border-border last:border-0 ${
                    !notification.isRead ? "bg-primary/5" : ""
                  } ${isLinkRequest || isSuggestedLink ? "cursor-default" : ""}`}
                >
                  <div className={`p-2 rounded-full shrink-0 ${
                    isSuggestedLink
                      ? "bg-[hsl(45,90%,50%,0.2)] text-[hsl(45,90%,50%)]"
                      : isLinkRequest
                      ? "bg-[hsl(45,90%,50%,0.2)] text-[hsl(45,90%,50%)]"
                      : !notification.isRead
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-sans ${!notification.isRead ? "font-medium" : ""}`}>
                      {isSuggestedLink ? (
                        <span className="text-[hsl(45,90%,50%)]">Intelligence de Lignage</span>
                      ) : isLinkRequest ? (
                        <span className="text-[hsl(45,90%,50%)]">Demande d'union</span>
                      ) : (
                        notification.memorialName
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>

                    {/* CTA for suggested links */}
                    {isSuggestedLink && (
                      <Link
                        to="/liens-suggeres"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[hsl(45,70%,35%)] hover:text-[hsl(45,90%,50%)] transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Voir les suggestions
                      </Link>
                    )}

                    {/* Accept / Reject buttons for link requests */}
                    {isLinkRequest && notification.linkRequestId && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1 bg-[hsl(var(--accent-green))] hover:bg-[hsl(var(--accent-green)/0.8)]"
                          onClick={(e) => handleAccept(notification.linkRequestId!, e)}
                          disabled={isProcessing}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => handleReject(notification.linkRequestId!, e)}
                          disabled={isProcessing}
                        >
                          <XCircle className="w-3 h-3" />
                          Refuser
                        </Button>
                      </div>
                    )}

                    {!isLinkRequest && !isSuggestedLink && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    )}
                  </div>
                  {!notification.isRead && !isLinkRequest && (
                    <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-sans">
                Aucune notification
              </p>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-border">
            <Link
              to="/compte"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs text-muted-foreground hover:text-foreground font-sans"
            >
              Voir tous les suivis
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
