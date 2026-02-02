import { createContext, useContext, ReactNode, useMemo } from "react";
import { SearchableMemorial } from "@/lib/searchWithRelations";
import { getMemorialType } from "@/lib/dateUtils";

// Données de démonstration enrichies avec les auteurs du livre d'or
// Note: Le type (RECENT/PAST) est calculé dynamiquement selon la règle des 6 mois
const mockMemorialsData = [
  {
    id: "1",
    slug: "jean-baptiste-kouassi",
    name: "Jean-Baptiste Kouassi",
    birthDate: "12 Mars 1945",
    deathDate: "8 Janvier 2025",
    bio: "Père dévoué, grand-père aimant et homme de foi.",
    photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face"],
    author: {
      id: "author-1",
      name: "Marie Kouassi",
      relation: "Sa Fille",
    },
    guestbookMessages: [
      { id: "m1", authorName: "Marie Kouassi", relationCategory: "Sa Fille", content: "Papa, tu nous manques." },
      { id: "m2", authorName: "Emmanuel Yao", relationCategory: "Son Collègue", content: "Un grand homme." },
      { id: "m3", authorName: "Adjoua Bamba", relationCategory: "Son Élève", content: "Merci pour tout." },
      { id: "m4", authorName: "Pierre Kouassi", relationCategory: "Son Fils", content: "Repose en paix papa." },
    ],
  },
  {
    id: "2",
    slug: "marie-therese-bamba",
    name: "Marie-Thérèse Bamba",
    birthDate: "5 Août 1952",
    deathDate: "2 Janvier 2025",
    bio: "Mère aimante et femme de cœur.",
    photos: ["https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&crop=face"],
    author: {
      id: "author-2",
      name: "Adjoua Bamba",
      relation: "Sa Fille",
    },
    guestbookMessages: [
      { id: "m5", authorName: "Adjoua Bamba", relationCategory: "Sa Fille", content: "Maman, tu es dans mon cœur." },
      { id: "m6", authorName: "Kouadio Bamba", relationCategory: "Son Fils", content: "Merci pour tout maman." },
      { id: "m7", authorName: "Yao Bamba", relationCategory: "Son Époux", content: "Mon amour éternel." },
    ],
  },
  {
    id: "3",
    slug: "paul-yao-akoto",
    name: "Paul Yao Akoto",
    birthDate: "18 Décembre 1938",
    deathDate: "15 Mars 2024",
    bio: "Homme de sagesse et de paix.",
    photos: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face"],
    author: {
      id: "author-3",
      name: "Emmanuel Yao",
      relation: "Son Fils",
    },
    guestbookMessages: [
      { id: "m8", authorName: "Emmanuel Yao", relationCategory: "Son Fils", content: "Tu restes mon modèle." },
      { id: "m9", authorName: "Awa Yao", relationCategory: "Sa Fille", content: "Papa adoré." },
    ],
  },
  {
    id: "4",
    slug: "aminata-diallo",
    name: "Aminata Diallo",
    birthDate: "3 Février 1960",
    deathDate: "15 Avril 2024",
    bio: "Une vie dédiée aux autres.",
    photos: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face"],
    author: {
      id: "author-4",
      name: "Fatou Diallo",
      relation: "Sa Nièce",
    },
    guestbookMessages: [
      { id: "m10", authorName: "Fatou Diallo", relationCategory: "Sa Nièce", content: "Tantine, tu nous manques." },
      { id: "m11", authorName: "Marie Kouassi", relationCategory: "Son Ami(e)", content: "Une amie précieuse." },
    ],
  },
  {
    id: "5",
    slug: "kofi-mensah",
    name: "Kofi Mensah",
    birthDate: "22 Juillet 1970",
    deathDate: "3 Janvier 2025",
    bio: "Artiste et visionnaire.",
    photos: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop&crop=face"],
    author: {
      id: "author-5",
      name: "Ama Mensah",
      relation: "Son Épouse",
    },
    guestbookMessages: [
      { id: "m12", authorName: "Ama Mensah", relationCategory: "Son Épouse", content: "Mon amour à jamais." },
      { id: "m13", authorName: "Kwame Mensah", relationCategory: "Son Fils", content: "Papa, ton art vit en nous." },
    ],
  },
  {
    id: "6",
    slug: "fatou-ndiaye",
    name: "Fatou Ndiaye",
    birthDate: "9 Avril 1985",
    deathDate: "28 Décembre 2024",
    bio: "Étoile partie trop tôt.",
    photos: ["https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=600&fit=crop&crop=face"],
    author: {
      id: "author-6",
      name: "Oumar Ndiaye",
      relation: "Son Frère",
    },
    guestbookMessages: [
      { id: "m14", authorName: "Oumar Ndiaye", relationCategory: "Son Frère", content: "Ma sœur adorée." },
      { id: "m15", authorName: "Aissatou Ndiaye", relationCategory: "Sa Sœur", content: "Tu restes dans nos cœurs." },
    ],
  },
];

interface MemorialsContextType {
  memorials: SearchableMemorial[];
  memorialCards: {
    id: string;
    slug: string;
    name: string;
    birthDate: string;
    deathDate: string;
    photoUrl: string;
    ripCount: number;
    candleCount: number;
    flowerCount: number;
    type: "RECENT" | "PAST";
  }[];
}

const MemorialsContext = createContext<MemorialsContextType | undefined>(undefined);

export const MemorialsProvider = ({ children }: { children: ReactNode }) => {
  const memorials = useMemo<SearchableMemorial[]>(() => 
    mockMemorialsData.map(m => ({
      ...m,
      type: getMemorialType(m.deathDate),
    })), 
  []);

  const memorialCards = useMemo(() => 
    memorials.map(m => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      birthDate: m.birthDate,
      deathDate: m.deathDate,
      photoUrl: m.photos[0],
      ripCount: Math.floor(Math.random() * 900) + 100,
      candleCount: Math.floor(Math.random() * 400) + 50,
      flowerCount: Math.floor(Math.random() * 200) + 30,
      type: m.type,
    })),
  [memorials]);

  return (
    <MemorialsContext.Provider value={{ memorials, memorialCards }}>
      {children}
    </MemorialsContext.Provider>
  );
};

export const useMemorials = () => {
  const context = useContext(MemorialsContext);
  if (context === undefined) {
    throw new Error("useMemorials must be used within a MemorialsProvider");
  }
  return context;
};
