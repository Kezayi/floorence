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

const RelationSelect = ({ value, onChange }: RelationSelectProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-memorial-dark border-memorial-dark-muted/30 text-memorial-dark-foreground">
        <SelectValue placeholder="Votre lien avec le défunt *" />
      </SelectTrigger>
      <SelectContent className="bg-memorial-dark border-memorial-dark-muted/30">
        {Object.entries(relationCategories).map(([category, relations]) => (
          <SelectGroup key={category}>
            <SelectLabel className="text-memorial-dark-muted font-sans text-xs">
              {category}
            </SelectLabel>
            {relations.map((relation) => (
              <SelectItem
                key={relation}
                value={relation}
                className="text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
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
