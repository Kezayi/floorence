 import { useState } from "react";
 import { Plus } from "lucide-react";
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
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface AddEventDialogProps {
   memorialId: string;
   onEventAdded: () => void;
   triggerButton?: React.ReactNode;
 }
 
const eventTypes = [
    { value: "Programme des obsèques", label: "Programme des obsèques", icon: "⚰️" },
    { value: "Recueillement", label: "Recueillement", icon: "🤝" },
  ];
 
 const AddEventDialog = ({ memorialId, onEventAdded, triggerButton }: AddEventDialogProps) => {
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [eventType, setEventType] = useState("");
   const [eventDate, setEventDate] = useState("");
   const [location, setLocation] = useState("");
   const [description, setDescription] = useState("");
 
   const resetForm = () => {
     setEventType("");
     setEventDate("");
     setLocation("");
     setDescription("");
   };
 
   const handleSubmit = async () => {
     if (!eventType || !eventDate) {
       toast.error("Veuillez remplir le type et la date de l'événement");
       return;
     }
 
     setLoading(true);
     try {
       const { error } = await supabase.from("memorial_events").insert({
         memorial_id: memorialId,
         event_type: eventType,
         event_date: new Date(eventDate).toISOString(),
         location: location || null,
         description: description || null,
         is_public: true,
       });
 
       if (error) {
         console.error("Error adding event:", error);
         toast.error("Erreur lors de l'ajout de l'événement");
         return;
       }
 
       toast.success("Événement ajouté avec succès");
       resetForm();
       setOpen(false);
       onEventAdded();
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
         {triggerButton || (
           <Button className="gap-2">
             <Plus className="w-4 h-4" />
             Ajouter un événement
           </Button>
         )}
       </DialogTrigger>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle>Planifier un événement</DialogTitle>
           <DialogDescription>
             Ajoutez une veillée, une inhumation ou un moment de recueillement
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-6 py-4">
           {/* Event Type */}
           <div className="space-y-2">
             <Label>Type d'événement *</Label>
             <Select value={eventType} onValueChange={setEventType}>
               <SelectTrigger>
                 <SelectValue placeholder="Sélectionner un type" />
               </SelectTrigger>
               <SelectContent>
                 {eventTypes.map((type) => (
                   <SelectItem key={type.value} value={type.value}>
                     <span className="flex items-center gap-2">
                       <span>{type.icon}</span>
                       {type.label}
                     </span>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           {/* Event Date */}
           <div className="space-y-2">
             <Label htmlFor="eventDate">Date et heure *</Label>
             <Input
               id="eventDate"
               type="datetime-local"
               value={eventDate}
               onChange={(e) => setEventDate(e.target.value)}
             />
           </div>
 
           {/* Location */}
           <div className="space-y-2">
             <Label htmlFor="location">Lieu</Label>
             <Input
               id="location"
               value={location}
               onChange={(e) => setLocation(e.target.value)}
               placeholder="Adresse, église, cimetière..."
             />
           </div>
 
           {/* Description */}
           <div className="space-y-2">
             <Label htmlFor="description">Description (optionnel)</Label>
             <Textarea
               id="description"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Informations complémentaires..."
               className="min-h-[80px]"
             />
           </div>
         </div>
 
         <div className="flex justify-end gap-3">
           <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
             Annuler
           </Button>
           <Button onClick={handleSubmit} disabled={loading}>
             {loading ? "Ajout..." : "Ajouter"}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default AddEventDialog;