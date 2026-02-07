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

// Catégories de relations alignées avec la matrice vectorielle (G, L, B, S)
const relationCategories = {
  "Famille directe": [
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
    "Son Arrière-grand-père",
    "Sa Arrière-grand-mère",
    "Son Arrière-petit-fils",
    "Sa Arrière-petite-fille",
  ],
  "Famille élargie": [
    "Son Oncle",
    "Sa Tante",
    "Son Neveu",
    "Sa Nièce",
    "Son Cousin",
    "Sa Cousine",
    "Son Grand-oncle",
    "Sa Grand-tante",
    "Son Petit-neveu",
    "Sa Petite-nièce",
    "Son Petit-cousin",
    "Sa Petite-cousine",
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
    "Son Bel-oncle",
    "Sa Belle-tante",
  ],
  "Socio cœur (Amis)": [
    "Son Frère de cœur",
    "Sa Sœur de cœur",
    "Son Ami(e)",
    "Son Collègue",
    "Son Parrain/Marraine",
    "Son Filleul(e)",
  ],
  "Autres": [
    "Son Voisin(e)",
    "Son Professeur",
    "Son Élève",
    "Son Mentor",
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
      <SelectContent className={`${isDark ? 'bg-memorial-dark border-memorial-dark-muted/30' : 'bg-card border-border'} max-h-80`}>
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
