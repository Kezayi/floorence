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
    label: "text-[hsl(30,80%,50%)]",
    item: "data-[highlighted]:bg-[hsl(30,80%,95%)]",
    dot: "bg-[hsl(30,80%,50%)]",
  },
  "Alliés": {
    label: "text-[hsl(var(--gesture-candle))]",
    item: "data-[highlighted]:bg-[hsl(45,90%,92%)]",
    dot: "bg-[hsl(var(--gesture-candle))]",
  },
  "Socio cœur (Amis)": {
    label: "text-[hsl(var(--gesture-flower))]",
    item: "data-[highlighted]:bg-[hsl(340,60%,95%)]",
    dot: "bg-[hsl(var(--gesture-flower))]",
  },
  "Autres": {
    label: "text-muted-foreground",
    item: "data-[highlighted]:bg-muted/50",
    dot: "bg-muted-foreground",
  },
};

const relationCategories = {
  "Famille directe": [
    "Son Père",
    "Sa Mère",
    "Son Fils",
    "Sa Fille",
    "Son Frère",
    "Sa Sœur",
    "Son Demi-frère",
    "Sa Demi-sœur",
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
    "Son Beau-fils",
    "Son Bel-oncle",
    "Sa Belle-tante",
    "Son Co-époux",
    "Sa Co-épouse",
  ],
  "Socio cœur (Amis)": [
    "Son Frère de cœur",
    "Sa Sœur de cœur",
    "Son Ami(e)",
    "Son Ami(e) d'enfance",
    "Son Collègue",
    "Son Parrain/Marraine",
    "Son Filleul(e)",
    "Son Camarade de promotion",
    "Son Compagnon d'armes",
  ],
  "Autres": [
    "Son Voisin(e)",
    "Son Professeur",
    "Son Élève",
    "Son Mentor",
    "Son Disciple",
    "Son Bailleur",
    "Son Client",
    "Son Employeur",
    "Son Pasteur/Imam",
    "Son Chef coutumier",
    "Une connaissance",
    "Un admirateur",
    "Un anonyme",
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
