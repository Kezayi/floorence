import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Html, Stars } from "@react-three/drei";
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

// Floating particles around a node
const NodeParticles = ({ 
  position, 
  color, 
  count = 8 
}: { 
  position: [number, number, number]; 
  color: string; 
  count?: number;
}) => {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

// Animated glow ring around nodes
const GlowRing = ({ 
  position, 
  color, 
  isCenter = false 
}: { 
  position: [number, number, number]; 
  color: string; 
  isCenter?: boolean;
}) => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      ringRef.current.scale.set(scale, scale, 1);
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });

  const size = isCenter ? 1.2 : 0.7;

  return (
    <mesh ref={ringRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 0.9, size, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Animated sphere for nodes with smooth spring animation
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
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [scale, setScale] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number, number]>([0, 0, 0]);
  const startTime = useRef<number | null>(null);
  const targetScale = isCenter ? 0.8 : 0.5;
  
  useFrame((state) => {
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = (state.clock.elapsedTime - startTime.current) * 1000;
    const animDelay = delay;
    
    // Smooth scale animation with spring physics
    if (elapsed > animDelay) {
      const progress = Math.min((elapsed - animDelay) / 800, 1);
      // Custom spring easing
      const springEase = (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      };
      setScale(springEase(progress) * targetScale);
      
      // Animate position from center
      const posProgress = Math.min((elapsed - animDelay) / 600, 1);
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      setCurrentPos([
        position[0] * easeOut(posProgress),
        position[1] * easeOut(posProgress),
        position[2] * easeOut(posProgress),
      ]);
    }
    
    // Smooth floating animation
    if (meshRef.current && scale > 0) {
      const floatY = Math.sin(state.clock.elapsedTime * 1.5 + delay * 0.01) * 0.08;
      const floatX = Math.cos(state.clock.elapsedTime * 1.2 + delay * 0.01) * 0.03;
      meshRef.current.position.y = currentPos[1] + floatY;
      meshRef.current.position.x = currentPos[0] + floatX;
      
      // Pulse effect on hover
      if (hovered) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.05;
        meshRef.current.scale.setScalar(scale * pulse);
      } else {
        meshRef.current.scale.setScalar(scale);
      }
    }
    
    // Glow pulse
    if (glowRef.current) {
      const glowPulse = 0.3 + Math.sin(state.clock.elapsedTime * 3 + delay * 0.01) * 0.1;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowPulse;
    }
  });

  return (
    <group position={[currentPos[0], currentPos[1], currentPos[2]]}>
      {/* Outer glow */}
      <mesh ref={glowRef} scale={scale * 1.8}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      
      {/* Particles */}
      {scale > 0.3 && !isCenter && (
        <NodeParticles position={[0, 0, 0]} color={color} count={6} />
      )}
      
      {/* Glow ring for center */}
      {isCenter && scale > 0.3 && (
        <GlowRing position={[0, 0, 0]} color={color} isCenter />
      )}
      
      {/* Name label */}
      {scale > 0.3 && (
        <Billboard position={[0, isCenter ? -1.4 : -1, 0]}>
          <Text
            fontSize={isCenter ? 0.28 : 0.2}
            color={isCenter ? "#ffffff" : "#1F2937"}
            anchorX="center"
            anchorY="top"
            outlineWidth={0.025}
            outlineColor={isCenter ? "#000000" : "#ffffff"}
            font="/fonts/inter.woff"
          >
            {name.split(" ")[0]}
          </Text>
        </Billboard>
      )}
      
      {/* Tooltip on hover */}
      {hovered && (
        <Html distanceFactor={8}>
          <div className="bg-background/95 backdrop-blur-sm border border-border shadow-xl rounded-lg px-4 py-3 text-sm whitespace-nowrap pointer-events-none animate-fade-in">
            <div className="font-serif font-medium text-foreground">{name}</div>
            <div className="text-muted-foreground text-xs flex items-center gap-2 mt-1">
              <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white/50" style={{ backgroundColor: color }} />
              {category}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Animated connection line with flowing particles
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
  const particleRef = useRef<THREE.Mesh>(null);
  const [progress, setProgress] = useState(0);
  const [particleProgress, setParticleProgress] = useState(0);
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = (state.clock.elapsedTime - startTime.current) * 1000;
    
    // Line drawing animation
    if (elapsed > delay) {
      const p = Math.min((elapsed - delay) / 400, 1);
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      setProgress(easeOut(p));
    }
    
    // Flowing particle along line
    if (particleRef.current && progress > 0.9) {
      const t = ((state.clock.elapsedTime * 0.5 + delay * 0.001) % 1);
      particleRef.current.position.set(
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
        start[2] + (end[2] - start[2]) * t
      );
      setParticleProgress(Math.min(particleProgress + 0.02, 1));
    }
  });

  const points = useMemo(() => {
    const currentEnd: [number, number, number] = [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
      start[2] + (end[2] - start[2]) * progress,
    ];
    return [
      new THREE.Vector3(...start),
      new THREE.Vector3(...currentEnd),
    ];
  }, [start, end, progress]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({ color, opacity: 0.4, transparent: true });
  }, [color]);

  if (progress === 0) return null;

  return (
    <group>
      <primitive object={new THREE.Line(geometry, lineMaterial)} />
      
      {/* Flowing particle */}
      {progress > 0.9 && (
        <mesh ref={particleRef}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={particleProgress * 0.8} />
        </mesh>
      )}
    </group>
  );
};

// Ambient floating particles in the scene
const AmbientParticles = ({ count = 100 }: { count?: number }) => {
  const particlesRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffff"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
};

const Scene = ({ deceasedName, nodes }: { deceasedName: string; nodes: RelationshipNode[] }) => {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-10, -5, -10]} intensity={0.6} color="#3B82F6" />
      <pointLight position={[0, -10, 5]} intensity={0.4} color="#22C55E" />
      
      {/* Background stars */}
      <Stars radius={50} depth={50} count={1000} factor={2} fade speed={0.5} />
      
      {/* Ambient floating particles */}
      <AmbientParticles count={80} />
      
      {/* Center node (deceased) */}
      <AnimatedNode
        position={[0, 0, 0]}
        color="#8B5CF6"
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
          delay={300 + index * 80}
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
          delay={500 + index * 120}
        />
      ))}
      
      {/* Controls */}
      <OrbitControls 
        enablePan={false} 
        minDistance={3} 
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
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
    const radius = 3.5;

    uniqueAuthors.forEach((value, key) => {
      // Distribute nodes in a sphere around center using fibonacci sphere
      const phi = Math.acos(-1 + (2 * index + 1) / Math.max(totalNodes, 1));
      const theta = Math.sqrt(Math.max(totalNodes, 1) * Math.PI) * phi;
      
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
      <div className="h-[450px] bg-gradient-to-b from-secondary to-muted rounded-sm flex items-center justify-center">
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
    <div className="h-[450px] bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] rounded-sm overflow-hidden relative">
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
        <Scene deceasedName={deceasedName} nodes={nodes} />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-xs font-sans">
        {[
          { color: "#8B5CF6", label: "Défunt" },
          { color: "#3B82F6", label: "Famille" },
          { color: "#22C55E", label: "Alliés" },
          { color: "#EAB308", label: "Amis" },
          { color: "#EF4444", label: "Autre" },
        ].map((item) => (
          <div 
            key={item.label} 
            className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/10"
          >
            <div 
              className="w-2.5 h-2.5 rounded-full shadow-lg" 
              style={{ 
                backgroundColor: item.color,
                boxShadow: `0 0 8px ${item.color}50`
              }} 
            />
            <span className="text-white/90">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelationshipGraph3D;
