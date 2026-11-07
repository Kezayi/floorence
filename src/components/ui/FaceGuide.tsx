/**
 * Gabarit biométrique calqué sur le portrait étalon (Odile MBIGOU) :
 * sommet de la tête ≈ 14 %, yeux ≈ 40 %, menton ≈ 69 % de la hauteur du cadre 3:4.
 */
export const FACE_GUIDE = { top: 14, eyes: 40, chin: 69, left: 24, right: 76 } as const;

const FaceGuide = ({ lines = true }: { lines?: boolean }) => (
  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
    <div
      className="absolute rounded-[50%] border border-dashed border-primary-foreground/70"
      style={{
        top: `${FACE_GUIDE.top}%`,
        bottom: `${100 - FACE_GUIDE.chin}%`,
        left: `${FACE_GUIDE.left}%`,
        right: `${100 - FACE_GUIDE.right}%`,
      }}
    />
    {lines && (
      <div className="absolute inset-x-0 border-t border-primary-foreground/50" style={{ top: `${FACE_GUIDE.eyes}%` }} />
    )}
  </div>
);

export default FaceGuide;
