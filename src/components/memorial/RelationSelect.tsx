import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RelationSelectProps {
  value: string;
  onChange: (value: string) => void;
  variant?: "dark" | "light";
}

const relationCategories = {
  "Famille": [
    "Son Père",
    "Sa Mère",
    "Son Fils",
    "Sa Fille",
    "Son Frère",
    "Sa Sœur",
    "Son Grand-père",
    "Sa Grand-mère",
    "Son Petit-fils",
    "Sa Petite-fille",
    "Son Oncle",
    "Sa Tante",
    "Son Neveu",
    "Sa Nièce",
    "Son Cousin",
    "Sa Cousine",
  ],
  "Alliés": [
    "Son Époux",
    "Son Épouse",
    "Son Beau-père",
    "Sa Belle-mère",
    "Son Beau-frère",
    "Sa Belle-sœur",
    "Son Gendre",
    "Sa Belle-fille",
  ],
  "Proches": [
    "Son Ami(e)",
    "Son Collègue",
    "Son Voisin(e)",
    "Son Professeur",
    "Son Élève",
    "Son Mentor",
    "Son Filleul(e)",
    "Son Parrain/Marraine",
  ],
  "Autres": [
    "Une connaissance",
    "Un admirateur",
    "Un anonyme",
  ],
};

const RelationSelect = ({ value, onChange, variant = "dark" }: RelationSelectProps) => {
  const isDark = variant === "dark";
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-full ${isDark ? 'bg-memorial-dark border-memorial-dark-muted/30 text-memorial-dark-foreground' : 'bg-secondary border-0 text-foreground'}`}>
        <SelectValue placeholder="Votre lien avec le défunt *" />
      </SelectTrigger>
      <SelectContent className={`${isDark ? 'bg-memorial-dark border-memorial-dark-muted/30' : 'bg-card border-border'}`}>
        {Object.entries(relationCategories).map(([category, relations]) => (
          <SelectGroup key={category}>
            <SelectLabel className={`font-sans text-xs ${isDark ? 'text-memorial-dark-muted' : 'text-muted-foreground'}`}>
              {category}
            </SelectLabel>
            {relations.map((relation) => (
              <SelectItem
                key={relation}
                value={relation}
                className={isDark ? 'text-memorial-dark-foreground hover:bg-memorial-dark-muted/20' : 'text-foreground hover:bg-muted'}
              >
                {relation}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};

export default RelationSelect;
