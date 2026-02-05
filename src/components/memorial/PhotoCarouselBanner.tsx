import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PhotoCarouselBannerProps {
  photos: string[];
  name: string;
  className?: string;
}

const PhotoCarouselBanner = ({ photos, name, className }: PhotoCarouselBannerProps) => {
  // Filter out empty photos and ensure we have at least some photos
  const validPhotos = useMemo(() => 
    photos.filter(photo => photo && photo.length > 0),
    [photos]
  );

  // Duplicate photos to create seamless infinite scroll effect
  // We need at least 6 items for smooth animation
  const duplicatedPhotos = useMemo(() => {
    if (validPhotos.length === 0) return [];
    const minItems = 6;
    let result = [...validPhotos];
    while (result.length < minItems) {
      result = [...result, ...validPhotos];
    }
    // Double for seamless loop
    return [...result, ...result];
  }, [validPhotos]);

  // If no photos, don't render anything
  if (validPhotos.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "w-full overflow-hidden bg-background/50",
        className
      )}
    >
      <div className="memorial-carousel-track flex">
        {duplicatedPhotos.map((photo, index) => (
          <div
            key={`${photo}-${index}`}
            className="memorial-carousel-item flex-shrink-0 w-64 h-80 md:w-80 md:h-96 mx-2"
          >
            <img
              src={photo}
              alt={`Portrait de ${name}`}
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500 ease-in-out"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <style>{`
        .memorial-carousel-track {
          animation: memorial-scroll 30s linear infinite;
          width: fit-content;
        }

        .memorial-carousel-track:hover {
          animation-play-state: paused;
        }

        @keyframes memorial-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .memorial-carousel-item img {
          filter: grayscale(100%);
        }

        .memorial-carousel-item img:hover {
          filter: grayscale(0%);
        }
      `}</style>
    </div>
  );
};

export default PhotoCarouselBanner;
