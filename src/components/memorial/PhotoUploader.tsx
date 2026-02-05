 import { useState, useRef } from "react";
 import { Upload, X, Star, Loader2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { toast } from "sonner";
 
 interface PhotoUploaderProps {
   photos: string[];
   defaultPhotoIndex: number;
   maxPhotos?: number;
   memorialId?: string;
   userId: string;
   onChange: (photos: string[], defaultIndex: number) => void;
   disabled?: boolean;
 }
 
 const PhotoUploader = ({
   photos,
   defaultPhotoIndex,
   maxPhotos = 3,
   memorialId,
   userId,
   onChange,
   disabled = false,
 }: PhotoUploaderProps) => {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [uploading, setUploading] = useState(false);
 
   const uploadPhoto = async (file: File): Promise<string | null> => {
     const fileExt = file.name.split(".").pop();
     const fileName = `${memorialId || "new"}-${Date.now()}.${fileExt}`;
     const filePath = `${userId}/${fileName}`;
 
     const { error: uploadError } = await supabase.storage
       .from("memorial-photos")
       .upload(filePath, file);
 
     if (uploadError) {
       console.error("Upload error:", uploadError);
       throw uploadError;
     }
 
     const { data } = supabase.storage
       .from("memorial-photos")
       .getPublicUrl(filePath);
 
     return data.publicUrl;
   };
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = e.target.files;
     if (!files || files.length === 0) return;
 
     const remainingSlots = maxPhotos - photos.length;
     if (remainingSlots <= 0) {
       toast.error(`Maximum ${maxPhotos} photos autorisées`);
       return;
     }
 
     const filesToUpload = Array.from(files).slice(0, remainingSlots);
     setUploading(true);
 
     try {
       const uploadedUrls: string[] = [];
 
       for (const file of filesToUpload) {
         // Validate file type
         if (!file.type.startsWith("image/")) {
           toast.error("Seules les images sont acceptées");
           continue;
         }
 
         // Validate file size (max 5MB)
         if (file.size > 5 * 1024 * 1024) {
           toast.error("La taille maximum est de 5 Mo par image");
           continue;
         }
 
         const url = await uploadPhoto(file);
         if (url) {
           uploadedUrls.push(url);
         }
       }
 
       if (uploadedUrls.length > 0) {
         const newPhotos = [...photos, ...uploadedUrls];
         onChange(newPhotos, defaultPhotoIndex);
         toast.success(`${uploadedUrls.length} photo(s) ajoutée(s)`);
       }
     } catch (error) {
       console.error("Upload error:", error);
       toast.error("Erreur lors de l'upload de la photo");
     } finally {
       setUploading(false);
       if (fileInputRef.current) {
         fileInputRef.current.value = "";
       }
     }
   };
 
   const removePhoto = (index: number) => {
     const newPhotos = photos.filter((_, i) => i !== index);
     // Adjust default index if needed
     let newDefaultIndex = defaultPhotoIndex;
     if (index === defaultPhotoIndex) {
       newDefaultIndex = 0;
     } else if (index < defaultPhotoIndex) {
       newDefaultIndex = defaultPhotoIndex - 1;
     }
     if (newDefaultIndex >= newPhotos.length) {
       newDefaultIndex = Math.max(0, newPhotos.length - 1);
     }
     onChange(newPhotos, newDefaultIndex);
   };
 
   const setDefaultPhoto = (index: number) => {
     onChange(photos, index);
   };
 
   return (
     <div className="space-y-4">
       {/* Photo Grid */}
       <div className="grid grid-cols-3 gap-3">
         {photos.map((photo, index) => (
           <div
             key={index}
             className={`relative aspect-[3/4] group ${
               index === defaultPhotoIndex ? "ring-2 ring-primary" : ""
             }`}
           >
             <img
               src={photo}
               alt={`Photo ${index + 1}`}
               className="w-full h-full object-cover"
             />
             {/* Overlay actions */}
             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
               <Button
                 type="button"
                 variant="secondary"
                 size="icon"
                 className="h-8 w-8"
                 onClick={() => setDefaultPhoto(index)}
                 disabled={disabled || index === defaultPhotoIndex}
                 title="Définir comme photo principale"
               >
                 <Star
                   className={`w-4 h-4 ${
                     index === defaultPhotoIndex ? "fill-primary text-primary" : ""
                   }`}
                 />
               </Button>
               <Button
                 type="button"
                 variant="destructive"
                 size="icon"
                 className="h-8 w-8"
                 onClick={() => removePhoto(index)}
                 disabled={disabled}
                 title="Supprimer"
               >
                 <X className="w-4 h-4" />
               </Button>
             </div>
             {/* Default indicator */}
             {index === defaultPhotoIndex && (
               <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                 Principale
               </div>
             )}
           </div>
         ))}
 
         {/* Add photo button */}
         {photos.length < maxPhotos && (
           <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             disabled={disabled || uploading}
             className="aspect-[3/4] border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
           >
             {uploading ? (
               <Loader2 className="w-6 h-6 animate-spin" />
             ) : (
               <>
                 <Upload className="w-6 h-6" />
                 <span className="text-xs font-sans">Ajouter</span>
               </>
             )}
           </button>
         )}
       </div>
 
       <input
         ref={fileInputRef}
         type="file"
         accept="image/*"
         multiple
         onChange={handleFileChange}
         className="hidden"
       />
 
       <p className="text-xs text-muted-foreground font-sans">
         Maximum {maxPhotos} photos. Cliquez sur l'étoile pour définir la photo principale.
       </p>
     </div>
   );
 };
 
 export default PhotoUploader;