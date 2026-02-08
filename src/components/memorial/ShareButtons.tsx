import { useState, useCallback } from "react";
import { Share2, X, Copy, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  /** Slug for the memorial - used to generate social preview URL */
  slug?: string;
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

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

/**
 * Generate the social preview URL that goes through the Edge Function
 * This ensures crawlers get proper OG meta tags
 */
const getSocialShareUrl = (slug: string | undefined, fallbackUrl: string): string => {
  if (!slug) return fallbackUrl;
  
  // Use the Edge Function URL for social sharing
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/social-preview?slug=${encodeURIComponent(slug)}`;
  }
  
  return fallbackUrl;
};

/**
 * Check if we can use native share API
 * Returns false in iframes/restricted contexts where permission is denied
 */
const canUseNativeShare = (): boolean => {
  // Check if navigator.share exists
  if (!navigator.share) return false;
  
  // Check if we're in an iframe (often restricted)
  try {
    if (window.self !== window.top) return false;
  } catch {
    // Cross-origin iframe - definitely can't use native share
    return false;
  }
  
  return true;
};

const ShareButtons = ({ url, title, description = "", slug }: ShareButtonsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  // Use social preview URL for crawlers, regular URL for native share
  const socialUrl = getSocialShareUrl(slug, url);
  const encodedSocialUrl = encodeURIComponent(socialUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedSocialUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedSocialUrl}&quote=${encodedTitle}`,
  };

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const handleShare = useCallback((platform: string) => {
    if (platform === "instagram") {
      // Instagram doesn't support direct URL sharing, copy link instead
      handleCopyLink();
      return;
    }

    const link = shareLinks[platform as keyof typeof shareLinks];
    if (link) {
      // Use window.open with _blank target and noopener for security
      window.open(link, "_blank", "noopener,noreferrer,width=600,height=400");
    }
    setIsOpen(false);
  }, [shareLinks, handleCopyLink]);

  const handleNativeShare = useCallback(async () => {
    // Try native share only if available and not in restricted context
    if (canUseNativeShare()) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        return; // Success - don't show dropdown
      } catch (err) {
        // User cancelled or permission denied - fall through to dropdown
        // Native share unavailable — fall through to dropdown
      }
    }
    
    // Fallback: show dropdown menu
    setIsOpen(!isOpen);
  }, [title, description, url, isOpen]);

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
                onClick={() => handleShare("instagram")}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted rounded-sm transition-colors"
              >
                <span className="text-[#E4405F]">
                  <InstagramIcon size={20} />
                </span>
                <span className="font-sans text-sm">Instagram</span>
                <span className="text-xs text-muted-foreground ml-auto">(copie lien)</span>
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
