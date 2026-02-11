import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface RelationSelection {
  category: string;   // Technical category: "famille_directe", "famille_elargie", "allies", "socio_coeur", "autres"
  link: string;       // Exact label: "Son Père", "Sa Mère", etc.
}

interface RelationSelectProps {
  value: string;
  onChange: (selection: RelationSelection) => void;
  variant?: "dark" | "light";
}

// Technical category keys
const CATEGORY_KEYS: Record<string, string> = {
  "Famille directe": "famille_directe",
  "Famille élargie": "famille_elargie",
  "Alliés": "allies",
  "Socio cœur (Amis)": "socio_coeur",
  "Autres": "autres",
};

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

/** Find category key for a given relation link */
export const getCategoryKeyForLink = (link: string): string => {
  for (const [categoryLabel, relations] of Object.entries(relationCategories)) {
    if (relations.includes(link)) {
      return CATEGORY_KEYS[categoryLabel] || "autres";
    }
  }
  return "autres";
};

const RelationSelect = ({ value, onChange, variant = "dark" }: RelationSelectProps) => {
  const isDark = variant === "dark";

  const handleChange = (selectedLink: string) => {
    const categoryKey = getCategoryKeyForLink(selectedLink);
    onChange({ category: categoryKey, link: selectedLink });
  };
  
  return (
    <Select value={value} onValueChange={handleChange}>
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
