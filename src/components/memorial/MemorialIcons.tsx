// Custom memorial icons — safe for ref-forwarding contexts
import { forwardRef, type SVGAttributes } from "react";

type IconProps = SVGAttributes<SVGSVGElement> & {
  size?: number;
};

// Black memorial cross for RIP
export const CrossIcon = forwardRef<SVGSVGElement, IconProps>(
  function CrossIcon({ className = "", size = 24, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        {...rest}
      >
        <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6V2z" />
      </svg>
    );
  }
);

// Flickering flame for candle (yellow to red gradient)
export const FlameIcon = forwardRef<SVGSVGElement, IconProps>(
  function FlameIcon({ className = "", size = 24, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        {...rest}
      >
        <defs>
          <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <filter id="flameGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M12 22c-4.97 0-7-3.58-7-7 0-2.79 1.64-5.28 3.14-7.24.9-1.18 1.86-2.18 2.6-2.96.22-.23.42-.44.6-.63.17.19.37.4.59.63.74.78 1.7 1.78 2.6 2.96C16.03 9.72 17.67 12.21 17.67 15c0 3.42-2.03 7-5.67 7z"
          fill="url(#flameGradient)"
          filter="url(#flameGlow)"
          className="animate-flicker"
        />
        <path
          d="M12 18c-1.66 0-3-1.34-3-3 0-1.12.73-2.18 1.35-2.96.25-.32.5-.58.65-.75.15.17.4.43.65.75C12.27 12.82 13 13.88 13 15c0 1.66-1.34 3-1 3z"
          fill="#FEF3C7"
          opacity="0.8"
        />
      </svg>
    );
  }
);

// Chrysanthemum flower (green/white)
export const ChrysanthemumIcon = forwardRef<SVGSVGElement, IconProps>(
  function ChrysanthemumIcon({ className = "", size = 24, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        {...rest}
      >
        <defs>
          <linearGradient id="petalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F0FDF4" />
            <stop offset="100%" stopColor="#BBF7D0" />
          </linearGradient>
          <linearGradient id="petalGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DCFCE7" />
            <stop offset="100%" stopColor="#86EFAC" />
          </linearGradient>
        </defs>
        {/* Outer petals */}
        <ellipse cx="12" cy="5" rx="2" ry="4" fill="url(#petalGradient)" />
        <ellipse cx="12" cy="19" rx="2" ry="4" fill="url(#petalGradient)" />
        <ellipse cx="5" cy="12" rx="4" ry="2" fill="url(#petalGradient)" />
        <ellipse cx="19" cy="12" rx="4" ry="2" fill="url(#petalGradient)" />
        {/* Diagonal petals */}
        <ellipse cx="7" cy="7" rx="2" ry="3.5" transform="rotate(-45 7 7)" fill="url(#petalGradient2)" />
        <ellipse cx="17" cy="7" rx="2" ry="3.5" transform="rotate(45 17 7)" fill="url(#petalGradient2)" />
        <ellipse cx="7" cy="17" rx="2" ry="3.5" transform="rotate(45 7 17)" fill="url(#petalGradient2)" />
        <ellipse cx="17" cy="17" rx="2" ry="3.5" transform="rotate(-45 17 17)" fill="url(#petalGradient2)" />
        {/* Inner petals */}
        <ellipse cx="12" cy="8" rx="1.5" ry="3" fill="#D1FAE5" />
        <ellipse cx="12" cy="16" rx="1.5" ry="3" fill="#D1FAE5" />
        <ellipse cx="8" cy="12" rx="3" ry="1.5" fill="#D1FAE5" />
        <ellipse cx="16" cy="12" rx="3" ry="1.5" fill="#D1FAE5" />
        {/* Center */}
        <circle cx="12" cy="12" r="2.5" fill="#22C55E" />
        <circle cx="12" cy="12" r="1.5" fill="#4ADE80" />
      </svg>
    );
  }
);
