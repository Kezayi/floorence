import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";

interface RelationshipNode {
  id: string;
  name: string;
  category: string;
  position: [number, number, number];
}

interface RelationshipGraph3DProps {
  deceasedName: string;
  posts: Array<{
    authorId: string;
    authorName: string;
    relationCategory: string;
  }>;
}

// Map category to color
const getCategoryColor = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  
  // Famille - Bleu
  if (
    lowerCategory.includes("fils") ||
    lowerCategory.includes("fille") ||
    lowerCategory.includes("père") ||
    lowerCategory.includes("mère") ||
    lowerCategory.includes("frère") ||
    lowerCategory.includes("sœur") ||
    lowerCategory.includes("soeur") ||
    lowerCategory.includes("grand") ||
    lowerCategory.includes("petit") ||
    lowerCategory.includes("oncle") ||
    lowerCategory.includes("tante") ||
    lowerCategory.includes("cousin") ||
    lowerCategory.includes("neveu") ||
    lowerCategory.includes("nièce") ||
    lowerCategory.includes("niece")
  ) {
    return "#3B82F6"; // Blue
  }
  
  // Alliés - Vert
  if (
    lowerCategory.includes("époux") ||
    lowerCategory.includes("épouse") ||
    lowerCategory.includes("mari") ||
    lowerCategory.includes("femme") ||
    lowerCategory.includes("beau") ||
    lowerCategory.includes("belle") ||
    lowerCategory.includes("gendre") ||
    lowerCategory.includes("bru")
  ) {
    return "#22C55E"; // Green
  }
  
  // Amis/Connaissances - Jaune
  if (
    lowerCategory.includes("ami") ||
    lowerCategory.includes("connaissance") ||
    lowerCategory.includes("collègue") ||
    lowerCategory.includes("collegue") ||
    lowerCategory.includes("voisin") ||
    lowerCategory.includes("camarade") ||
    lowerCategory.includes("élève") ||
    lowerCategory.includes("eleve")
  ) {
    return "#EAB308"; // Yellow
  }
  
  // Autre - Rouge
  return "#EF4444"; // Red
};

// Animated sphere for nodes
const AnimatedNode = ({ 
  position, 
  color, 
  name, 
  category,
  isCenter = false,
  delay = 0 
}: { 
  position: [number, number, number]; 
  color: string; 
  name: string;
  category: string;
  isCenter?: boolean;
  delay?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [scale, setScale] = useState(0);
  const startTime = useRef<number | null>(null);
  
  useFrame((state) => {
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = (state.clock.elapsedTime - startTime.current) * 1000;
    const animDelay = delay;
    
    if (elapsed > animDelay) {
      const progress = Math.min((elapsed - animDelay) / 500, 1);
      // Elastic ease out
      const elasticOut = (t: number) => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
      };
      setScale(elasticOut(progress));
    }
    
    // Subtle floating animation
    if (meshRef.current && scale > 0) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + delay) * 0.05;
    }
  });

  const size = isCenter ? 0.8 : 0.5;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={scale * size}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={hovered ? color : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      
      {/* Name label */}
      {scale > 0.5 && (
        <Billboard position={[0, isCenter ? -1.2 : -0.8, 0]}>
          <Text
            fontSize={isCenter ? 0.25 : 0.18}
            color={isCenter ? "#ffffff" : "#1F2937"}
            anchorX="center"
            anchorY="top"
            outlineWidth={0.02}
            outlineColor={isCenter ? "#000000" : "#ffffff"}
          >
            {name.split(" ")[0]}
          </Text>
        </Billboard>
      )}
      
      {/* Tooltip on hover */}
      {hovered && (
        <Html distanceFactor={8}>
          <div className="bg-background border border-border shadow-lg rounded-md px-3 py-2 text-sm whitespace-nowrap pointer-events-none">
            <div className="font-serif font-medium text-foreground">{name}</div>
            <div className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {category}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Connection line between nodes
const ConnectionLine = ({ 
  start, 
  end, 
  color,
  delay = 0
}: { 
  start: [number, number, number]; 
  end: [number, number, number];
  color: string;
  delay?: number;
}) => {
  const [progress, setProgress] = useState(0);
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = (state.clock.elapsedTime - startTime.current) * 1000;
    
    if (elapsed > delay) {
      const p = Math.min((elapsed - delay) / 300, 1);
      setProgress(p);
    }
  });

  const points = useMemo(() => {
    const currentEnd: [number, number, number] = [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
      start[2] + (end[2] - start[2]) * progress,
    ];
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...currentEnd),
    ]);
  }, [start, end, progress]);

  if (progress === 0) return null;

  return (
    <primitive object={new THREE.Line(points, new THREE.LineBasicMaterial({ color, opacity: 0.6, transparent: true }))} />
  );
};

const Scene = ({ deceasedName, nodes }: { deceasedName: string; nodes: RelationshipNode[] }) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Center node (deceased) */}
      <AnimatedNode
        position={[0, 0, 0]}
        color="#1a1a1a"
        name={deceasedName}
        category="Défunt"
        isCenter
        delay={0}
      />
      
      {/* Connection lines */}
      {nodes.map((node, index) => (
        <ConnectionLine
          key={`line-${node.id}`}
          start={[0, 0, 0]}
          end={node.position}
          color={getCategoryColor(node.category)}
          delay={200 + index * 100}
        />
      ))}
      
      {/* Author nodes */}
      {nodes.map((node, index) => (
        <AnimatedNode
          key={node.id}
          position={node.position}
          color={getCategoryColor(node.category)}
          name={node.name}
          category={node.category}
          delay={400 + index * 150}
        />
      ))}
      
      {/* Controls */}
      <OrbitControls 
        enablePan={false} 
        minDistance={3} 
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
};

const RelationshipGraph3D = ({ deceasedName, posts }: RelationshipGraph3DProps) => {
  // Create unique nodes from posts arranged in 3D space
  const nodes = useMemo(() => {
    const uniqueAuthors = new Map<string, { name: string; category: string }>();
    
    posts.forEach((post) => {
      if (!uniqueAuthors.has(post.authorId)) {
        uniqueAuthors.set(post.authorId, {
          name: post.authorName,
          category: post.relationCategory,
        });
      }
    });

    const authorNodes: RelationshipNode[] = [];
    let index = 0;
    const totalNodes = uniqueAuthors.size;
    const radius = 3;

    uniqueAuthors.forEach((value, key) => {
      // Distribute nodes in a sphere around center
      const phi = Math.acos(-1 + (2 * index + 1) / totalNodes);
      const theta = Math.sqrt(totalNodes * Math.PI) * phi;
      
      authorNodes.push({
        id: key,
        name: value.name,
        category: value.category,
        position: [
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta),
        ],
      });
      index++;
    });

    return authorNodes;
  }, [posts]);

  if (nodes.length === 0) {
    return (
      <div className="h-[400px] bg-secondary rounded-sm flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Aucun hommage n'a encore été déposé.</p>
          <p className="text-sm mt-1">
            Le graphe se construira au fur et à mesure des publications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] bg-gradient-to-b from-secondary to-muted rounded-sm overflow-hidden">
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
        <Scene deceasedName={deceasedName} nodes={nodes} />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 text-xs font-sans">
        {[
          { color: "#1a1a1a", label: "Défunt" },
          { color: "#3B82F6", label: "Famille" },
          { color: "#22C55E", label: "Alliés" },
          { color: "#EAB308", label: "Amis" },
          { color: "#EF4444", label: "Autre" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelationshipGraph3D;
