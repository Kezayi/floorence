import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  url?: string;
  /** Name of the deceased for memorial pages */
  deceasedName?: string;
  /** Age at death for memorial pages */
  age?: number | null;
}

const DEFAULT_TITLE = "Floorence — Honorer, Relier et Transmettre";
const DEFAULT_DESCRIPTION = "Floorence est une infrastructure mémorielle numérique. Honorez la mémoire de vos proches disparus avec dignité et sobriété.";
const DEFAULT_IMAGE = "/icons/icon-512x512.png";

/**
 * Generate a social sharing description for memorial pages.
 * Includes the deceased name, age, and a sober call to remembrance.
 * Format optimized for WhatsApp/Facebook previews.
 */
const generateMemorialDescription = (
  name: string,
  age: number | null,
  bio?: string
): string => {
  const ageText = age ? ` (${age} ans)` : "";
  return `Rejoignez la communauté de mémoire de ${name}${ageText} sur Floorence. Laissez un message ou un geste de recueillement.`;
};

/**
 * Hook to dynamically update document meta tags for SEO and social sharing.
 * Call this in page components with page-specific content.
 */
export const useSEO = ({
  title,
  description,
  image,
  type = "website",
  url,
  deceasedName,
  age,
}: SEOProps = {}) => {
  useEffect(() => {
    // Update document title
    document.title = title ? `${title} | Floorence` : DEFAULT_TITLE;

    // Helper to update or create a meta tag
    const updateMeta = (selector: string, content: string, attribute = "content") => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (element) {
        element.setAttribute(attribute, content);
      } else {
        // Create the meta tag if it doesn't exist
        element = document.createElement("meta");
        const parts = selector.match(/\[(.+?)="(.+?)"\]/);
        if (parts) {
          element.setAttribute(parts[1], parts[2]);
        }
        element.setAttribute(attribute, content);
        document.head.appendChild(element);
      }
    };

    // Generate description: use memorial-specific format if deceasedName provided
    const finalDescription = deceasedName
      ? generateMemorialDescription(deceasedName, age ?? null, description)
      : description || DEFAULT_DESCRIPTION;

    // Ensure image is absolute URL for social sharing
    const absoluteImage = image
      ? image.startsWith("http")
        ? image
        : `${window.location.origin}${image.startsWith("/") ? "" : "/"}${image}`
      : `${window.location.origin}${DEFAULT_IMAGE}`;

    // Standard meta description
    updateMeta('meta[name="description"]', finalDescription);

    // Open Graph tags
    updateMeta('meta[property="og:title"]', title || DEFAULT_TITLE);
    updateMeta('meta[property="og:description"]', finalDescription);
    updateMeta('meta[property="og:image"]', absoluteImage);
    updateMeta('meta[property="og:type"]', type);
    if (url) {
      updateMeta('meta[property="og:url"]', url);
    }

    // Twitter tags - use large image card for memorials
    updateMeta('meta[name="twitter:card"]', deceasedName ? "summary_large_image" : "summary");
    updateMeta('meta[name="twitter:title"]', title || DEFAULT_TITLE);
    updateMeta('meta[name="twitter:description"]', finalDescription);
    updateMeta('meta[name="twitter:image"]', absoluteImage);

    // Cleanup: Reset to defaults when component unmounts
    return () => {
      document.title = DEFAULT_TITLE;
      updateMeta('meta[name="description"]', DEFAULT_DESCRIPTION);
      updateMeta('meta[property="og:title"]', DEFAULT_TITLE);
      updateMeta('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      updateMeta('meta[property="og:image"]', `${window.location.origin}${DEFAULT_IMAGE}`);
      updateMeta('meta[property="og:type"]', "website");
      updateMeta('meta[name="twitter:card"]', "summary");
    };
  }, [title, description, image, type, url, deceasedName, age]);
};

export default useSEO;
