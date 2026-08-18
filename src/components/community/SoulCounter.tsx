import { useEffect, useRef, useState } from "react";

interface SoulCounterProps {
  /** Nombre de nœuds actuellement présents dans le Prisme */
  count: number;
  label?: string;
  className?: string;
}

/**
 * Compteur discret positionné en haut du Prisme.
 * - Transition fluide de la valeur (interpolation ~600ms).
 * - Brève lueur dorée lorsqu'un nouveau nœud apparaît (Realtime).
 * Animations limitées à opacity / transform / text-shadow pour préserver le score PageSpeed.
 */
const SoulCounter = ({ count, label = "âmes reliées", className = "" }: SoulCounterProps) => {
  const [display, setDisplay] = useState(count);
  const [glowing, setGlowing] = useState(false);
  const prevRef = useRef(count);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevRef.current;
    const to = count;
    prevRef.current = count;
    if (from === to) return;

    if (to > from) {
      setGlowing(true);
      const t = window.setTimeout(() => setGlowing(false), 1400);
      // eslint-disable-next-line consistent-return
      var clearGlow = () => window.clearTimeout(t);
    }

    const duration = 600;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // @ts-expect-error conditional cleanup
      if (typeof clearGlow === "function") clearGlow();
    };
  }, [count]);

  return (
    <div
      className={`inline-flex items-baseline gap-2 font-sans text-sm text-muted-foreground select-none ${className}`}
      aria-live="polite"
      aria-label={`${count} ${label}`}
    >
      <span
        className="font-serif text-lg tabular-nums text-foreground transition-[text-shadow,transform] duration-500 ease-out will-change-transform"
        style={
          glowing
            ? { textShadow: "0 0 12px rgba(212, 175, 55, 0.8)", transform: "scale(1.06)" }
            : { textShadow: "0 0 0 rgba(212, 175, 55, 0)", transform: "scale(1)" }
        }
      >
        {display}
      </span>
      <span className="text-xs uppercase tracking-wide">{label}</span>
    </div>
  );
};

export default SoulCounter;
