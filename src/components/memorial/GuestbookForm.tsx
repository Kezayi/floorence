import { useState, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import RelationSelect from "./RelationSelect";
import { Button } from "@/components/ui/button";

interface GuestbookFormProps {
  onSubmit: (data: {
    content: string;
    relationCategory: string;
    photos: string[];
  }) => void;
}

const MAX_PHOTOS = 3;

const GuestbookForm = ({ onSubmit }: GuestbookFormProps) => {
  const [messageContent, setMessageContent] = useState("");
  const [selectedRelation, setSelectedRelation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedRelation) return;

    onSubmit({
      content: messageContent.trim(),
      relationCategory: selectedRelation,
      photos,
    });

    // Reset form
    setMessageContent("");
    setSelectedRelation("");
    setPhotos([]);
  };

  const canSubmit = messageContent.trim() && selectedRelation;

  return (
    <form onSubmit={handleSubmit} className="mb-12">
      <div className="space-y-4">
        <RelationSelect value={selectedRelation} onChange={setSelectedRelation} />

        <textarea
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          placeholder="Votre message..."
          rows={4}
          className="w-full p-4 bg-memorial-dark border border-memorial-dark-muted/30 text-memorial-dark-foreground placeholder:text-memorial-dark-muted font-serif resize-none focus:outline-none focus:ring-1 focus:ring-memorial-dark-foreground/30"
        />

        {/* Photo upload section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
              className="gap-2 bg-transparent border-memorial-dark-muted/30 text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
            >
              <ImagePlus className="w-4 h-4" />
              Ajouter des photos ({photos.length}/{MAX_PHOTOS})
            </Button>
          </div>

          {/* Photo preview grid */}
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative w-20 h-20 overflow-hidden rounded-sm group"
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Supprimer la photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-memorial bg-memorial-dark-foreground text-memorial-dark hover:bg-memorial-dark-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Publier mon hommage
        </button>
      </div>
    </form>
  );
};

export default GuestbookForm;
