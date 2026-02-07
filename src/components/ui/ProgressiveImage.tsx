import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
}

const ProgressiveImage = ({
  src,
  alt,
  className,
  priority = false,
  ...props
}: ProgressiveImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Blur-up placeholder */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div className="w-full h-full bg-muted animate-pulse" />
        {/* Low-res blurred preview using same URL */}
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: "blur(20px)" }}
          loading="eager"
        />
      </div>

      {/* Full resolution image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "transition-opacity duration-700",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
};

export default ProgressiveImage;
