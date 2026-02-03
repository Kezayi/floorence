import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  url?: string;
}

const DEFAULT_TITLE = "Floorence — Honorer, Relier et Transmettre";
const DEFAULT_DESCRIPTION = "Floorence est une infrastructure mémorielle numérique. Honorez la mémoire de vos proches disparus avec dignité et sobriété.";
const DEFAULT_IMAGE = "/icons/icon-512x512.png";

/**
 * Hook to dynamically update document meta tags for SEO and social sharing.
 * Call this in page components with page-specific content.
 */
export const useSEO = ({ title, description, image, type = "website", url }: SEOProps = {}) => {
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

    // Standard meta description
    updateMeta('meta[name="description"]', description || DEFAULT_DESCRIPTION);

    // Open Graph tags
    updateMeta('meta[property="og:title"]', title || DEFAULT_TITLE);
    updateMeta('meta[property="og:description"]', description || DEFAULT_DESCRIPTION);
    updateMeta('meta[property="og:image"]', image || DEFAULT_IMAGE);
    updateMeta('meta[property="og:type"]', type);
    if (url) {
      updateMeta('meta[property="og:url"]', url);
    }

    // Twitter tags
    updateMeta('meta[name="twitter:title"]', title || DEFAULT_TITLE);
    updateMeta('meta[name="twitter:description"]', description || DEFAULT_DESCRIPTION);
    updateMeta('meta[name="twitter:image"]', image || DEFAULT_IMAGE);

    // Cleanup: Reset to defaults when component unmounts
    return () => {
      document.title = DEFAULT_TITLE;
      updateMeta('meta[name="description"]', DEFAULT_DESCRIPTION);
      updateMeta('meta[property="og:title"]', DEFAULT_TITLE);
      updateMeta('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      updateMeta('meta[property="og:image"]', DEFAULT_IMAGE);
      updateMeta('meta[property="og:type"]', "website");
    };
  }, [title, description, image, type, url]);
};

export default useSEO;
