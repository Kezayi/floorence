import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string | null;
  onAvatarUpdated: (url: string) => void;
}

const AvatarUpload = ({ userId, currentAvatarUrl, displayName, onAvatarUpdated }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (displayName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/avatar.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", userId)
        .select("id");

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) throw new Error("Profil introuvable : photo non enregistrée");

      onAvatarUpdated(publicUrl);
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Erreur lors du téléchargement de la photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      // List and remove existing avatar files
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(userId);

      if (files && files.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }

      // Clear avatar_url in profile
      await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", userId);

      onAvatarUpdated("");
      toast.success("Photo de profil supprimée");
    } catch (err) {
      console.error("Avatar remove error:", err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative group">
        <Avatar className="w-20 h-20 border-2 border-border">
          {currentAvatarUrl ? (
            <AvatarImage src={currentAvatarUrl} alt={displayName || "Avatar"} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-muted text-muted-foreground text-xl font-serif">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Upload overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Changer la photo de profil"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-background animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-background" />
          )}
        </button>

        {/* Remove button */}
        {currentAvatarUrl && !uploading && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Supprimer la photo"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div>
        <p className="text-sm font-sans text-foreground font-medium">Photo de profil</p>
        <p className="text-xs text-muted-foreground font-sans">
          Votre sceau d'auteur. Visible sur tous vos hommages.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-primary hover:underline font-sans mt-1"
        >
          {currentAvatarUrl ? "Modifier" : "Ajouter une photo"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
