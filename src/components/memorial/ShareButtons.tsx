import { useState, useCallback } from "react";
import { Share2, X, Copy, Check, MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  /** Slug for the memorial - used as fallback if no shareToken */
  slug?: string;
  /** Obfuscated share token - preferred for external sharing URLs */
  shareToken?: string | null;
}

// Custom social media icons
const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

/**
 * Generate the social preview URL via the Edge Function.
 * Prefers share_token (obfuscated) over slug for anti-enumeration.
 */
const getSocialShareUrl = (
  shareToken: string | null | undefined,
  slug: string | undefined,
  fallbackUrl: string,
): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return fallbackUrl;

  // Prefer share_token for obfuscated sharing
  if (shareToken) {
    return `${supabaseUrl}/functions/v1/social-preview?token=${encodeURIComponent(shareToken)}`;
  }

  // Fallback to slug if no token available
  if (slug) {
    return `${supabaseUrl}/functions/v1/social-preview?slug=${encodeURIComponent(slug)}`;
  }

  return fallbackUrl;
};

/**
 * Check if we can use native share API
 * Returns false in iframes/restricted contexts where permission is denied
 */
const canUseNativeShare = (): boolean => {
  if (!navigator.share) return false;
  
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  
  return true;
};

const ShareButtons = ({ url, title, description = "", slug, shareToken }: ShareButtonsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Use share_token-based URL for crawlers, regular URL for native share
  const socialUrl = getSocialShareUrl(shareToken, slug, url);
  const encodedSocialUrl = encodeURIComponent(socialUrl);
  const encodedTitle = encodeURIComponent(title);
  const smsBody = encodeURIComponent(`${title} — ${socialUrl}`);

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedSocialUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedSocialUrl}&quote=${encodedTitle}`,
    sms: `sms:?body=${smsBody}`,
  };

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(socialUrl);
      setCopied(true);
      toast({
        title: "Lien de mémoire copié",
        description: "Partagez ce lien pour honorer ensemble cette mémoire.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = socialUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast({
        title: "Lien de mémoire copié",
        description: "Partagez ce lien pour honorer ensemble cette mémoire.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  }, [socialUrl, toast]);

  const handleShare = useCallback((platform: string) => {
    const link = shareLinks[platform as keyof typeof shareLinks];
    if (link) {
      if (platform === "sms") {
        window.location.href = link;
      } else {
        window.open(link, "_blank", "noopener,noreferrer,width=600,height=400");
      }
    }
    setIsOpen(false);
  }, [shareLinks]);

  const handleNativeShare = useCallback(async () => {
    if (canUseNativeShare()) {
      try {
        await navigator.share({
          title,
          text: description || `Découvrez l'espace mémoriel sur Floorence`,
          url: socialUrl,
        });
        return;
      } catch {
        // User cancelled or permission denied — fall through to dropdown
      }
    }
    
    setIsOpen(!isOpen);
  }, [title, description, socialUrl, isOpen]);

  return (
    <div className="relative z-50">
      <button
        onClick={handleNativeShare}
        className="btn-ghost"
        aria-label="Partager"
      >
        <Share2 className="w-4 h-4" />
        <span>Partager</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Share menu */}
          <div className="absolute top-full left-0 mt-2 bg-background border border-border rounded-sm shadow-lg z-[70] min-w-[200px] animate-fade-in">
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border mb-2">
                <span className="text-sm font-sans text-muted-foreground">Partager via</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => handleShare("whatsapp")}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted rounded-sm transition-colors"
              >
                <span className="text-[#25D366]">
                  <WhatsAppIcon size={20} />
                </span>
                <span className="font-sans text-sm">WhatsApp</span>
              </button>
              
              <button
                onClick={() => handleShare("facebook")}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted rounded-sm transition-colors"
              >
                <span className="text-[#1877F2]">
                  <FacebookIcon size={20} />
                </span>
                <span className="font-sans text-sm">Facebook</span>
              </button>
              
              <button
                onClick={() => handleShare("sms")}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted rounded-sm transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <span className="font-sans text-sm">SMS</span>
              </button>
              
              {/* Copy link button */}
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted rounded-sm transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-accent-green" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="font-sans text-sm">
                    {copied ? "Lien copié !" : "Copier le lien"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButtons;
