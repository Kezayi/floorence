 import { useState, useEffect } from "react";
 import { Pencil, Loader2, ShieldCheck } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import PhotoUploader from "./PhotoUploader";
 import DigitalHeirSettings from "./DigitalHeirSettings";
 import { toast } from "sonner";
 
 interface EditMemorialDialogProps {
   memorialId: string;
   initialData: {
     bio: string;
     funeralDate?: string | null;
     funeralLocation?: string | null;
     photos?: string[];
     defaultPhotoIndex?: number;
     memorialId?: string;
   };
   onSave: () => void;
 }
 
 const EditMemorialDialog = ({ memorialId, initialData, onSave }: EditMemorialDialogProps) => {
   const { user } = useAuth();
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [bio, setBio] = useState(initialData.bio || "");
   const [funeralDate, setFuneralDate] = useState(initialData.funeralDate || "");
   const [funeralLocation, setFuneralLocation] = useState(initialData.funeralLocation || "");
   const [photos, setPhotos] = useState<string[]>(initialData.photos || []);
   const [defaultPhotoIndex, setDefaultPhotoIndex] = useState(initialData.defaultPhotoIndex || 0);
   const [heirEmail, setHeirEmail] = useState<string | null>(null);
 
   // Reset state when dialog opens
   useEffect(() => {
     if (open) {
       setBio(initialData.bio || "");
       setFuneralDate(initialData.funeralDate || "");
       setFuneralLocation(initialData.funeralLocation || "");
       setPhotos(initialData.photos || []);
       setDefaultPhotoIndex(initialData.defaultPhotoIndex || 0);
       // Fetch heir_email securely (owner-only via RLS on memorials table)
       supabase
         .from('memorials')
         .select('heir_email')
         .eq('id', memorialId)
         .maybeSingle()
         .then(({ data }) => setHeirEmail(data?.heir_email || null));
     }
   }, [open, initialData, memorialId]);
 
   const handlePhotosChange = (newPhotos: string[], newDefaultIndex: number) => {
     setPhotos(newPhotos);
     setDefaultPhotoIndex(newDefaultIndex);
   };
 
   const handleSave = async () => {
     setLoading(true);
     try {
       // Determine the primary photo URL
       const primaryPhotoUrl = photos.length > 0 ? photos[defaultPhotoIndex] || photos[0] : null;
 
       const { error } = await supabase
         .from("memorials")
         .update({
           biography: bio,
           funeral_date: funeralDate || null,
           funeral_location: funeralLocation || null,
           photos: photos,
           default_photo_index: defaultPhotoIndex,
           photo_url: primaryPhotoUrl,
           updated_at: new Date().toISOString(),
         })
         .eq("id", memorialId);
 
       if (error) {
         console.error("Error updating memorial:", error);
         toast.error("Erreur lors de la mise à jour");
         return;
       }
 
       toast.success("Mémorial mis à jour avec succès");
       setOpen(false);
       onSave();
     } catch (err) {
       console.error("Error:", err);
       toast.error("Une erreur est survenue");
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={setOpen}>
       <DialogTrigger asChild>
         <Button variant="outline" size="sm" className="gap-2">
           <Pencil className="w-4 h-4" />
           Modifier
         </Button>
       </DialogTrigger>
       <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Modifier l'avis de décès</DialogTitle>
           <DialogDescription>
             Mettez à jour les informations de l'espace mémoriel
           </DialogDescription>
         </DialogHeader>
 
          <Tabs defaultValue="info" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="gestion" className="gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Transmission
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-4">
              {/* Biography */}
              <div className="space-y-2">
                <Label htmlFor="bio">Biographie / Avis de décès</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Rédigez l'avis de décès..."
                  className="min-h-[150px]"
                />
              </div>

              {/* Funeral Date */}
              <div className="space-y-2">
                <Label htmlFor="funeralDate">Date des obsèques</Label>
                <Input
                  id="funeralDate"
                  type="datetime-local"
                  value={funeralDate ? funeralDate.slice(0, 16) : ""}
                  onChange={(e) => setFuneralDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
                />
              </div>

              {/* Funeral Location */}
              <div className="space-y-2">
                <Label htmlFor="funeralLocation">Lieu des obsèques</Label>
                <Input
                  id="funeralLocation"
                  value={funeralLocation}
                  onChange={(e) => setFuneralLocation(e.target.value)}
                  placeholder="Église, cimetière, etc."
                />
              </div>
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              {user && (
                <PhotoUploader
                  photos={photos}
                  defaultPhotoIndex={defaultPhotoIndex}
                  maxPhotos={3}
                  memorialId={memorialId}
                  userId={user.id}
                  onChange={handlePhotosChange}
                  disabled={loading}
                />
              )}
            </TabsContent>

            <TabsContent value="gestion" className="mt-4">
              <DigitalHeirSettings
                memorialId={memorialId}
                currentHeirEmail={heirEmail}
              />
            </TabsContent>
          </Tabs>
 
         <div className="flex justify-end gap-3">
           <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
             Annuler
           </Button>
           <Button onClick={handleSave} disabled={loading} className="gap-2">
             {loading && <Loader2 className="w-4 h-4 animate-spin" />}
             {loading ? "Enregistrement..." : "Enregistrer"}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default EditMemorialDialog;