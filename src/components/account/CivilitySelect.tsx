import { CIVILITIES, isCivility, type Civility } from "../../../supabase/functions/_shared/civility";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CivilitySelect({ id, value, onChange, required = false }: {
  id: string; value: Civility | null; onChange: (value: Civility) => void; required?: boolean;
}) {
  return <div className="space-y-1">
    <Label htmlFor={id}>Civilité{required ? " *" : ""}</Label>
    <Select value={value ?? ""} onValueChange={(v) => { if (isCivility(v)) onChange(v); }}>
      <SelectTrigger id={id} aria-required={required}><SelectValue placeholder="Sélectionner" /></SelectTrigger>
      <SelectContent>{CIVILITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}