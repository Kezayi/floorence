import confetti from "canvas-confetti";

/**
 * Launches a golden confetti burst to celebrate a validated lineage link.
 */
export function fireGoldenConfetti() {
  const gold = "#D4AF37";
  const amber = "#F5C542";
  const cream = "#FFF8DC";

  const defaults = {
    spread: 80,
    ticks: 120,
    gravity: 0.7,
    decay: 0.92,
    startVelocity: 35,
    colors: [gold, amber, cream, "#FFD700", "#C5A028"],
    shapes: ["circle" as const, "square" as const],
    scalar: 1.1,
  };

  // Two bursts from left and right for a dramatic effect
  confetti({
    ...defaults,
    particleCount: 60,
    origin: { x: 0.3, y: 0.6 },
    angle: 60,
  });

  confetti({
    ...defaults,
    particleCount: 60,
    origin: { x: 0.7, y: 0.6 },
    angle: 120,
  });

  // Delayed center burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 40,
      origin: { x: 0.5, y: 0.5 },
      spread: 120,
      startVelocity: 25,
    });
  }, 200);
}
