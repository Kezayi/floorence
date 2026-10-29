import { CIVILITIES, isCivility, type Civility } from "../../../supabase/functions/_shared/civility";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CivilitySelect({ id, value, onChange, required = false, readOnly = false }: {
  id: string; value: Civility | null; onChange: (value: Civility) => void; required?: boolean; readOnly?: boolean;
}) {
  return <div className="space-y-1">
    <Label htmlFor={id}>Civilité{required ? " *" : ""}</Label>
    {readOnly ? <input id={id} value={value ?? ""} readOnly aria-readonly="true" className="w-full h-10 px-3 bg-secondary border border-border rounded-sm text-foreground" /> : <Select value={value ?? ""} onValueChange={(v) => { if (isCivility(v)) onChange(v); }}>
      <SelectTrigger id={id} aria-required={required}><SelectValue placeholder="Sélectionner" /></SelectTrigger>
      <SelectContent>{CIVILITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
    </Select>}
  </div>;
}