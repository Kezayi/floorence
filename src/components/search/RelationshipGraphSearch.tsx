import { useMemo } from "react";
import { getCleanRelationName, UserRelationResult } from "@/lib/relationshipInference";

interface RelationshipGraphSearchProps {
  userName: string;
  userRelation?: string;
  personName: string;
  personRelation: string;
  deceasedName: string;
  inferredRelation?: UserRelationResult;
}

const RelationshipGraphSearch = ({
  userName,
  userRelation,
  personName,
  personRelation,
  deceasedName,
  inferredRelation,
}: RelationshipGraphSearchProps) => {
  // Configuration du graphe
  const config = useMemo(() => {
    const width = 320;
    const height = 240;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Positions des nœuds
    const nodes = {
      deceased: { x: centerX, y: 60, label: deceasedName, type: "deceased" as const },
      user: { x: 80, y: 180, label: userName, type: "user" as const },
      person: { x: 240, y: 180, label: personName, type: "person" as const },
    };
    
    return { width, height, nodes };
  }, [userName, personName, deceasedName]);

  const { width, height, nodes } = config;

  // Couleurs selon la charte
  const getNodeColor = (type: "deceased" | "user" | "person") => {
    switch (type) {
      case "deceased": return "#1F2937"; // Gris anthracite
      case "user": return "#3B82F6"; // Bleu pour l'utilisateur
      case "person": return "#10B981"; // Vert pour la personne recherchée
    }
  };

  const getLineColor = (confidence?: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high": return "#10B981"; // Vert
      case "medium": return "#F59E0B"; // Doré
      case "low": return "#9CA3AF"; // Gris
      default: return "#1F2937"; // Noir
    }
  };

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ maxHeight: "240px" }}
      >
        {/* Définitions */}
        <defs>
          <filter id="shadow-search" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
          <marker
            id="arrowhead-search"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="#1F2937" />
          </marker>
        </defs>

        {/* Ligne: Utilisateur -> Défunt */}
        {userRelation && (
          <g>
            <line
              x1={nodes.user.x}
              y1={nodes.user.y - 20}
              x2={nodes.deceased.x - 30}
              y2={nodes.deceased.y + 20}
              stroke="#1F2937"
              strokeWidth="2"
              markerEnd="url(#arrowhead-search)"
            />
            <text
              x={(nodes.user.x + nodes.deceased.x - 30) / 2 - 10}
              y={(nodes.user.y - 20 + nodes.deceased.y + 20) / 2}
              className="text-[10px] fill-muted-foreground font-sans"
              textAnchor="middle"
            >
              {getCleanRelationName(userRelation)}
            </text>
          </g>
        )}

        {/* Ligne: Personne -> Défunt */}
        <g>
          <line
            x1={nodes.person.x}
            y1={nodes.person.y - 20}
            x2={nodes.deceased.x + 30}
            y2={nodes.deceased.y + 20}
            stroke="#1F2937"
            strokeWidth="2"
            markerEnd="url(#arrowhead-search)"
          />
          <text
            x={(nodes.person.x + nodes.deceased.x + 30) / 2 + 10}
            y={(nodes.person.y - 20 + nodes.deceased.y + 20) / 2}
            className="text-[10px] fill-muted-foreground font-sans"
            textAnchor="middle"
          >
            {getCleanRelationName(personRelation)}
          </text>
        </g>

        {/* Ligne inférée: Utilisateur <-> Personne */}
        {inferredRelation && (
          <g>
            <line
              x1={nodes.user.x + 30}
              y1={nodes.user.y}
              x2={nodes.person.x - 30}
              y2={nodes.person.y}
              stroke={getLineColor(inferredRelation.confidence)}
              strokeWidth="3"
              strokeDasharray={inferredRelation.confidence === "low" ? "4,4" : "0"}
            />
            <rect
              x={(nodes.user.x + nodes.person.x) / 2 - 40}
              y={nodes.user.y - 12}
              width="80"
              height="24"
              rx="12"
              fill={getLineColor(inferredRelation.confidence)}
              opacity="0.15"
            />
            <text
              x={(nodes.user.x + nodes.person.x) / 2}
              y={nodes.user.y + 4}
              className="text-[11px] font-sans font-medium"
              fill={getLineColor(inferredRelation.confidence)}
              textAnchor="middle"
            >
              {inferredRelation.label.replace("Votre ", "")}
            </text>
          </g>
        )}

        {/* Nœud: Défunt (centre haut) */}
        <g filter="url(#shadow-search)">
          <circle
            cx={nodes.deceased.x}
            cy={nodes.deceased.y}
            r="24"
            fill={getNodeColor("deceased")}
          />
          <text
            x={nodes.deceased.x}
            y={nodes.deceased.y + 4}
            className="text-[12px] fill-white font-serif"
            textAnchor="middle"
          >
            {deceasedName.split(" ")[0]?.charAt(0) || "D"}
          </text>
          <text
            x={nodes.deceased.x}
            y={nodes.deceased.y - 35}
            className="text-[11px] fill-foreground font-serif"
            textAnchor="middle"
          >
            {deceasedName.length > 15 ? deceasedName.substring(0, 15) + "..." : deceasedName}
          </text>
          <text
            x={nodes.deceased.x}
            y={nodes.deceased.y - 48}
            className="text-[9px] fill-muted-foreground font-sans uppercase tracking-wide"
            textAnchor="middle"
          >
            Défunt
          </text>
        </g>

        {/* Nœud: Utilisateur (gauche bas) */}
        {userRelation && (
          <g filter="url(#shadow-search)">
            <circle
              cx={nodes.user.x}
              cy={nodes.user.y}
              r="22"
              fill={getNodeColor("user")}
            />
            <text
              x={nodes.user.x}
              y={nodes.user.y + 4}
              className="text-[11px] fill-white font-sans font-medium"
              textAnchor="middle"
            >
              Vous
            </text>
            <text
              x={nodes.user.x}
              y={nodes.user.y + 40}
              className="text-[10px] fill-muted-foreground font-sans"
              textAnchor="middle"
            >
              {getCleanRelationName(userRelation)}
            </text>
          </g>
        )}

        {/* Nœud: Personne recherchée (droite bas) */}
        <g filter="url(#shadow-search)">
          <circle
            cx={nodes.person.x}
            cy={nodes.person.y}
            r="22"
            fill={getNodeColor("person")}
          />
          <text
            x={nodes.person.x}
            y={nodes.person.y + 4}
            className="text-[11px] fill-white font-serif"
            textAnchor="middle"
          >
            {personName.split(" ")[0]?.charAt(0) || "P"}
          </text>
          <text
            x={nodes.person.x}
            y={nodes.person.y + 40}
            className="text-[10px] fill-foreground font-serif"
            textAnchor="middle"
          >
            {personName.length > 12 ? personName.substring(0, 12) + "..." : personName}
          </text>
        </g>
      </svg>

      {/* Légende */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground font-sans">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
          <span>Vous</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#10B981]" />
          <span>Résultat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#1F2937]" />
          <span>Défunt</span>
        </div>
      </div>
    </div>
  );
};

export default RelationshipGraphSearch;
