 import { useState } from "react";
 import { Pencil } from "lucide-react";
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
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface EditMemorialDialogProps {
   memorialId: string;
   initialData: {
     bio: string;
     funeralDate?: string | null;
     funeralLocation?: string | null;
   };
   onSave: () => void;
 }
 
 const EditMemorialDialog = ({ memorialId, initialData, onSave }: EditMemorialDialogProps) => {
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [bio, setBio] = useState(initialData.bio || "");
   const [funeralDate, setFuneralDate] = useState(initialData.funeralDate || "");
   const [funeralLocation, setFuneralLocation] = useState(initialData.funeralLocation || "");
 
   const handleSave = async () => {
     setLoading(true);
     try {
       const { error } = await supabase
         .from("memorials")
         .update({
           biography: bio,
           funeral_date: funeralDate || null,
           funeral_location: funeralLocation || null,
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
 
         <div className="space-y-6 py-4">
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
         </div>
 
         <div className="flex justify-end gap-3">
           <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
             Annuler
           </Button>
           <Button onClick={handleSave} disabled={loading}>
             {loading ? "Enregistrement..." : "Enregistrer"}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default EditMemorialDialog;