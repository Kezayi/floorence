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
  category: string;
  link: string;
}

interface RelationSelectProps {
  value: string;
  onChange: (selection: RelationSelection) => void;
  variant?: "dark" | "light";
}

const CATEGORY_KEYS: Record<string, string> = {
  "Famille directe": "famille_directe",
  "Famille élargie": "famille_elargie",
  "Alliés": "allies",
  "Socio cœur (Amis)": "socio_coeur",
  "Autres": "autres",
};

const CATEGORY_COLORS: Record<string, { label: string; item: string; dot: string }> = {
  "Famille directe": {
    label: "text-[hsl(0,70%,50%)]",
    item: "data-[highlighted]:bg-[hsl(0,70%,95%)]",
    dot: "bg-[hsl(0,70%,50%)]",
  },
  "Famille élargie": {
    label: "text-[hsl(45,90%,45%)]",
    item: "data-[highlighted]:bg-[hsl(45,90%,92%)]",
    dot: "bg-[hsl(45,90%,45%)]",
  },
  "Alliés": {
    label: "text-[hsl(145,60%,40%)]",
    item: "data-[highlighted]:bg-[hsl(145,60%,92%)]",
    dot: "bg-[hsl(145,60%,40%)]",
  },
  "Socio cœur (Amis)": {
    label: "text-[hsl(210,70%,50%)]",
    item: "data-[highlighted]:bg-[hsl(210,70%,92%)]",
    dot: "bg-[hsl(210,70%,50%)]",
  },
  "Autres": {
    label: "text-[hsl(0,0%,15%)]",
    item: "data-[highlighted]:bg-[hsl(0,0%,92%)]",
    dot: "bg-[hsl(0,0%,15%)]",
  },
};

const relationCategories = {
  "Famille directe": [
    "Son Père",
    "Sa Mère",
    "Son Fils",
    "Sa Fille",
    "Son Grand-père",
    "Sa Grand-mère",
    "Son Petit-fils",
    "Sa Petite-fille",
    "Son Arrière-grand-père",
    "Sa Arrière-grand-mère",
    "Son Arrière-petit-fils",
    "Sa Arrière-petite-fille",
    "Son Frère",
    "Sa Sœur",
  ],
  "Famille élargie": [
    "Son Oncle",
    "Sa Tante",
    "Son Neveu",
    "Sa Nièce",
    "Son Cousin",
    "Sa Cousine",
    "Son Grand-oncle",
    "Sa Grande-tante",
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
    "Son Beau-fils",
    "Sa Belle-fille",
    "Son Beau-frère",
    "Sa Belle-sœur",
    "Son Bel-oncle",
    "Sa Belle-tante",
  ],
  "Socio cœur (Amis)": [
    "Son Frère d'une autre mère",
    "Sa Sœur d'une autre mère",
    "Son Ami",
    "Son Collègue",
    "Son Co-équipier",
    "Sa Co-équipière",
    "Son Parrain",
    "Sa Marraine",
    "Son Filleul",
    "Sa Filleule",
  ],
  "Autres": [
    "Son Client",
    "Sa Cliente",
    "Son Fournisseur",
    "Son Prestataire",
    "Son Associé(e)",
    "Son Élève",
    "Son Étudiant(e)",
    "Son Disciple",
    "Son Camarade de classe",
    "Son Voisin",
    "Sa Voisine",
    "Son Copropriétaire",
    "Son Locataire",
    "Son Bailleur",
  ],
};

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
        {Object.entries(relationCategories).map(([category, relations]) => {
          const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS["Autres"];
          return (
            <SelectGroup key={category}>
              <SelectLabel className={`font-sans text-xs font-semibold flex items-center gap-2 ${colors.label}`}>
                <span className={`inline-block w-2 h-2 rounded-full ${colors.dot}`} />
                {category}
              </SelectLabel>
              {relations.map((relation) => (
                <SelectItem
                  key={relation}
                  value={relation}
                  className={`${isDark ? 'text-memorial-dark-foreground hover:bg-memorial-dark-muted/20' : 'text-foreground hover:bg-muted'} ${colors.item}`}
                >
                  {relation}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default RelationSelect;
