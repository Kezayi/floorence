// Search across memorials and authors with relationship inference

export interface SearchableMemorial {
  id: string;
  slug: string;
  name: string;
  birthDate: string;
  deathDate: string;
  bio: string;
  photos: string[];
  type: "RECENT" | "PAST";
  author: {
    id: string;
    name: string;
    relation: string;
  };
  guestbookMessages: Array<{
    id: string;
    authorName: string;
    relationCategory: string;
    content: string;
    candleCount?: number;
    flowerCount?: number;
  }>;
  // Extended fields from database
  createdBy?: string;
  donationEnabled?: boolean;
  funeralDate?: string;
  funeralLocation?: string;
  heirUserId?: string;
  heirEmail?: string;
}

export interface SearchResult {
  type: "memorial" | "author";
  id: string;
  name: string;
  relation?: string; // If author, their relation to deceased
  memorialId: string;
  memorialName: string;
  memorialSlug: string;
  photo?: string;
}

export interface RelationshipEdge {
  from: SearchResult;
  to: SearchResult;
  relationshipType: "author_of" | "same_memorial" | "indirect_family" | "shared_circle";
  label: string;
  confidence: "high" | "medium" | "low";
}

export interface SearchWithRelationsResult {
  results: SearchResult[];
  relationships: RelationshipEdge[];
  clusters: SearchResult[][];
}

// Search function
export const searchMemorialsAndAuthors = (
  query: string,
  memorials: SearchableMemorial[]
): SearchResult[] => {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const memorial of memorials) {
    const memorialNameNormalized = memorial.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Search in memorial name
    if (memorialNameNormalized.includes(normalizedQuery)) {
      const key = `memorial-${memorial.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          type: "memorial",
          id: memorial.id,
          name: memorial.name,
          memorialId: memorial.id,
          memorialName: memorial.name,
          memorialSlug: memorial.slug,
          photo: memorial.photos[0],
        });
      }
    }

    // Search in memorial author
    const authorNameNormalized = memorial.author.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (authorNameNormalized.includes(normalizedQuery)) {
      const key = `author-${memorial.author.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          type: "author",
          id: memorial.author.id,
          name: memorial.author.name,
          relation: memorial.author.relation,
          memorialId: memorial.id,
          memorialName: memorial.name,
          memorialSlug: memorial.slug,
          photo: memorial.photos[0],
        });
      }
    }

    // Search in guestbook authors
    for (const message of memorial.guestbookMessages) {
      const msgAuthorNormalized = message.authorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (msgAuthorNormalized.includes(normalizedQuery)) {
        const key = `guestbook-${memorial.id}-${message.authorName}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            type: "author",
            id: message.id,
            name: message.authorName,
            relation: message.relationCategory,
            memorialId: memorial.id,
            memorialName: memorial.name,
            memorialSlug: memorial.slug,
            photo: memorial.photos[0],
          });
        }
      }
    }
  }

  return results;
};

// Infer relationships between search results
export const inferSearchRelationships = (
  results: SearchResult[],
  memorials: SearchableMemorial[]
): RelationshipEdge[] => {
  const relationships: RelationshipEdge[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const r1 = results[i];
      const r2 = results[j];
      
      const pairKey = [r1.id, r2.id].sort().join("|");
      if (seen.has(pairKey)) continue;

      // Same memorial = direct connection
      if (r1.memorialId === r2.memorialId) {
        seen.add(pairKey);
        
        // Author of memorial
        if (r1.type === "memorial" && r2.type === "author") {
          relationships.push({
            from: r2,
            to: r1,
            relationshipType: "author_of",
            label: r2.relation || "A contribué",
            confidence: "high",
          });
        } else if (r2.type === "memorial" && r1.type === "author") {
          relationships.push({
            from: r1,
            to: r2,
            relationshipType: "author_of",
            label: r1.relation || "A contribué",
            confidence: "high",
          });
        } else if (r1.type === "author" && r2.type === "author") {
          // Two authors on same memorial - infer their relationship
          const inferredRelation = inferFamilyRelationship(r1.relation, r2.relation);
          relationships.push({
            from: r1,
            to: r2,
            relationshipType: inferredRelation.type,
            label: inferredRelation.label,
            confidence: inferredRelation.confidence,
          });
        }
      } else {
        // Different memorials - check for indirect connections
        // Could be same author appearing on multiple memorials
        if (r1.name === r2.name && r1.type === "author" && r2.type === "author") {
          seen.add(pairKey);
          relationships.push({
            from: r1,
            to: r2,
            relationshipType: "shared_circle",
            label: "Même personne, différents mémoriaux",
            confidence: "medium",
          });
        }
      }
    }
  }

  return relationships;
};

// Helper to infer family relationships
const inferFamilyRelationship = (
  relation1?: string,
  relation2?: string
): { type: "indirect_family" | "shared_circle"; label: string; confidence: "high" | "medium" | "low" } => {
  if (!relation1 || !relation2) {
    return { type: "shared_circle", label: "Même cercle", confidence: "low" };
  }

  // Same relation type = siblings or same role
  if (relation1 === relation2) {
    if (relation1.includes("Fils") || relation1.includes("Fille")) {
      return { type: "indirect_family", label: "Frères et sœurs", confidence: "high" };
    }
    if (relation1.includes("Frère") || relation1.includes("Sœur")) {
      return { type: "indirect_family", label: "Frères et sœurs du défunt", confidence: "high" };
    }
    return { type: "shared_circle", label: "Même rôle", confidence: "medium" };
  }

  // Child + Spouse = Parent-child
  const isChild1 = relation1.includes("Fils") || relation1.includes("Fille");
  const isChild2 = relation2.includes("Fils") || relation2.includes("Fille");
  const isSpouse1 = relation1.includes("Époux") || relation1.includes("Épouse");
  const isSpouse2 = relation2.includes("Époux") || relation2.includes("Épouse");

  if ((isChild1 && isSpouse2) || (isChild2 && isSpouse1)) {
    return { type: "indirect_family", label: "Parent et enfant", confidence: "high" };
  }

  // Sibling + Child = Uncle/Aunt and Nephew/Niece
  const isSibling1 = relation1.includes("Frère") || relation1.includes("Sœur");
  const isSibling2 = relation2.includes("Frère") || relation2.includes("Sœur");

  if ((isSibling1 && isChild2) || (isSibling2 && isChild1)) {
    return { type: "indirect_family", label: "Oncle/Tante et Neveu/Nièce", confidence: "high" };
  }

  // Parent + Child = Grandparent and Grandchild
  const isParent1 = relation1.includes("Père") || relation1.includes("Mère");
  const isParent2 = relation2.includes("Père") || relation2.includes("Mère");

  if ((isParent1 && isChild2) || (isParent2 && isChild1)) {
    return { type: "indirect_family", label: "Grands-parents et petits-enfants", confidence: "high" };
  }

  // Default
  return { type: "shared_circle", label: "Proches du défunt", confidence: "medium" };
};

// Group results into clusters by memorial
export const clusterResults = (results: SearchResult[]): SearchResult[][] => {
  const clusters = new Map<string, SearchResult[]>();
  
  for (const result of results) {
    const existing = clusters.get(result.memorialId) || [];
    existing.push(result);
    clusters.set(result.memorialId, existing);
  }
  
  return Array.from(clusters.values());
};

// Full search with relations
export const searchWithRelations = (
  query: string,
  memorials: SearchableMemorial[]
): SearchWithRelationsResult => {
  const results = searchMemorialsAndAuthors(query, memorials);
  const relationships = inferSearchRelationships(results, memorials);
  const clusters = clusterResults(results);
  
  return { results, relationships, clusters };
};
