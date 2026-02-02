import { useState } from "react";
import { CrossIcon, FlameIcon, ChrysanthemumIcon } from "./MemorialIcons";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface GuestbookPostData {
  id: string;
  authorId: string;
  authorName: string;
  relationCategory: string;
  content: string;
  photos: string[];
  createdAt: string;
  // Note: Chaque post vaut automatiquement 1 RIP
  candleCount: number;
  flowerCount: number;
}

interface GuestbookPostProps {
  post: GuestbookPostData;
  isOwner: boolean;
  onAddCandles: (postId: string, count: number) => void;
  onAddFlowers: (postId: string, count: number) => void;
}

const GuestbookPost = ({
  post,
  isOwner,
  onAddCandles,
  onAddFlowers,
}: GuestbookPostProps) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [candleDialogOpen, setCandleDialogOpen] = useState(false);
  const [flowerDialogOpen, setFlowerDialogOpen] = useState(false);
  const [candleQuantity, setCandleQuantity] = useState(1);
  const [flowerQuantity, setFlowerQuantity] = useState(1);

  const formattedDate = new Date(post.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleCandleConfirm = () => {
    if (candleQuantity > 0) {
      onAddCandles(post.id, candleQuantity);
      setCandleDialogOpen(false);
      setCandleQuantity(1);
    }
  };

  const handleFlowerConfirm = () => {
    if (flowerQuantity > 0) {
      onAddFlowers(post.id, flowerQuantity);
      setFlowerDialogOpen(false);
      setFlowerQuantity(1);
    }
  };

  return (
    <article className="py-6 border-b border-memorial-dark-muted/20 last:border-0">
      {/* Author info */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h4 className="font-serif text-lg text-memorial-dark-foreground">
            {post.authorName}
          </h4>
          <span className="inline-block mt-1 px-2 py-0.5 bg-memorial-dark-muted/20 text-memorial-dark-muted text-xs font-sans">
            {post.relationCategory}
          </span>
        </div>
        <time className="text-xs text-memorial-dark-muted font-sans">
          {formattedDate}
        </time>
      </div>

      {/* Message content */}
      <p className="font-serif text-base leading-relaxed text-memorial-dark-foreground/90 italic mb-4">
        "{post.content}"
      </p>

      {/* Photo gallery (max 3 photos) */}
      {post.photos.length > 0 && (
        <div className="relative mb-4">
          <div className="aspect-video overflow-hidden bg-memorial-dark-muted/20 rounded-sm relative group">
            <img
              src={post.photos[currentPhotoIndex]}
              alt={`Photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Navigation arrows */}
            {post.photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentPhotoIndex((prev) =>
                      prev === 0 ? post.photos.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentPhotoIndex((prev) =>
                      prev === post.photos.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {/* Photo counter */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-2 py-0.5 rounded-full text-xs font-sans">
                  {currentPhotoIndex + 1} / {post.photos.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {post.photos.length > 1 && (
            <div className="flex gap-1 mt-2">
              {post.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPhotoIndex(index)}
                  className={`w-12 h-12 overflow-hidden rounded-sm transition-all ${
                    index === currentPhotoIndex
                      ? "ring-2 ring-primary opacity-100"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gesture buttons for this post */}
      <div className="flex items-center gap-4 mt-4">
        {/* RIP - Automatique: 1 post = 1 RIP (non cliquable) */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-primary/20 text-primary">
          <CrossIcon size={18} className="text-primary" />
          <span className="text-sm font-sans">1 RIP</span>
        </div>

        {/* Candle - Opens quantity dialog (paid) */}
        <button
          onClick={() => setCandleDialogOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/30 text-memorial-dark-muted transition-all"
        >
          <FlameIcon size={18} />
          <span className="text-sm font-sans">{post.candleCount} Cierges</span>
        </button>

        {/* Flower - Opens quantity dialog (paid) */}
        <button
          onClick={() => setFlowerDialogOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/30 text-memorial-dark-muted transition-all"
        >
          <ChrysanthemumIcon size={18} />
          <span className="text-sm font-sans">{post.flowerCount} Fleurs</span>
        </button>
      </div>

      {/* Candle Dialog */}
      <Dialog open={candleDialogOpen} onOpenChange={setCandleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlameIcon size={24} />
              Allumer des cierges
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Les cierges sont facturés 500 FCFA l'unité. Ce geste symbolique
              honore la mémoire du défunt.
            </p>
            <div className="space-y-2">
              <Label htmlFor="candle-qty">Nombre de cierges</Label>
              <Input
                id="candle-qty"
                type="number"
                min={1}
                max={100}
                value={candleQuantity}
                onChange={(e) =>
                  setCandleQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary rounded-sm">
              <span className="font-sans text-sm">Total à payer:</span>
              <span className="font-serif text-lg font-medium">
                {(candleQuantity * 500).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCandleDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCandleConfirm} className="gap-2">
              <FlameIcon size={16} />
              Payer et allumer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flower Dialog */}
      <Dialog open={flowerDialogOpen} onOpenChange={setFlowerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChrysanthemumIcon size={24} />
              Déposer des fleurs
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Les fleurs sont facturées 1000 FCFA l'unité. Ce geste symbolique
              honore la mémoire du défunt.
            </p>
            <div className="space-y-2">
              <Label htmlFor="flower-qty">Nombre de fleurs</Label>
              <Input
                id="flower-qty"
                type="number"
                min={1}
                max={100}
                value={flowerQuantity}
                onChange={(e) =>
                  setFlowerQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary rounded-sm">
              <span className="font-sans text-sm">Total à payer:</span>
              <span className="font-serif text-lg font-medium">
                {(flowerQuantity * 1000).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlowerDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleFlowerConfirm} className="gap-2">
              <ChrysanthemumIcon size={16} />
              Payer et déposer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
};

export default GuestbookPost;
