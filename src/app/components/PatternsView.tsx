import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { storage } from '../utils/storage';
import { analyzeObservations } from '../utils/analysis';
import { PatternAnalysis } from '../types/observation';

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface StarNode {
  tag: string;
  count: number;
  x: number; // 0–1
  y: number; // 0–1
  radius: number;
  delay: number;
}

interface Edge {
  a: number;
  b: number;
  strength: number; // 0–1
}

function buildConstellation(topTags: PatternAnalysis['topTags'], maxCount: number): { nodes: StarNode[]; edges: Edge[] } {
  const nodes: StarNode[] = topTags.slice(0, 16).map((item, i) => {
    // Spread nodes across canvas with some randomness, avoiding edges
    const angle = (i / topTags.length) * Math.PI * 2 + seededRandom(i * 5) * 0.8;
    const dist = 0.18 + seededRandom(i * 7) * 0.28;
    const x = 0.5 + Math.cos(angle) * dist * 1.4;
    const y = 0.5 + Math.sin(angle) * dist * 0.9;

    return {
      tag: item.tag,
      count: item.count,
      x: Math.min(Math.max(x, 0.06), 0.94),
      y: Math.min(Math.max(y, 0.08), 0.88),
      radius: 2 + (item.count / maxCount) * 8,
      delay: seededRandom(i * 11) * 2,
    };
  });

  // Connect nodes that share conceptual proximity (by index closeness = topic similarity)
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Only connect nearby nodes
      if (dist < 0.35) {
        const strength = 1 - dist / 0.35;
        edges.push({ a: i, b: j, strength });
      }
    }
  }

  return { nodes, edges };
}

export function PatternsView() {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null);
  const [nodes, setNodes] = useState<StarNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [activeNode, setActiveNode] = useState<StarNode | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDims({
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    storage.getObservations().then((observations) => {
      const patterns = analyzeObservations(observations);
      setAnalysis(patterns);
      if (patterns.topTags.length > 0) {
        const maxCount = patterns.topTags[0].count;
        const { nodes, edges } = buildConstellation(patterns.topTags, maxCount);
        setNodes(nodes);
        setEdges(edges);
      }
    });
  }, []);

  if (!analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm text-gray-400 tracking-widest uppercase"
        >
          Reading patterns...
        </motion.div>
      </div>
    );
  }

  if (analysis.totalObservations === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <motion.p
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-gray-400 text-sm tracking-wide"
        >
          Record observations to surface patterns
        </motion.p>
      </div>
    );
  }

  const px = (val: number, dim: number) => val * dim;

  return (
    <div className="relative min-h-screen pb-24 bg-white overflow-hidden">

      {/* Quiet stats */}
      <div className="absolute top-5 left-5 z-10 pointer-events-none">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Observations</p>
          <p className="text-3xl font-light text-gray-800">{analysis.totalObservations}</p>
        </motion.div>
      </div>
      <div className="absolute top-5 right-5 z-10 pointer-events-none text-right">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Per Day</p>
          <p className="text-3xl font-light text-gray-800">{analysis.averagePerDay}</p>
        </motion.div>
      </div>

      {/* Constellation canvas */}
      <div ref={containerRef} className="absolute inset-0 bottom-24">
        {dims.w > 0 && (
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ overflow: 'visible' }}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const a = nodes[edge.a];
              const b = nodes[edge.b];
              if (!a || !b) return null;
              return (
                <motion.line
                  key={i}
                  x1={px(a.x, dims.w)}
                  y1={px(a.y, dims.h)}
                  x2={px(b.x, dims.w)}
                  y2={px(b.y, dims.h)}
                  stroke="black"
                  strokeWidth={edge.strength * 0.8}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: edge.strength * 0.18 }}
                  transition={{ delay: 0.8 + i * 0.03, duration: 1 }}
                />
              );
            })}

            {/* Stars */}
            {nodes.map((node, i) => (
              <motion.g
                key={node.tag}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: 'easeOut' }}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveNode(activeNode?.tag === node.tag ? null : node)}
              >
                {/* Pulse ring */}
                <motion.circle
                  cx={px(node.x, dims.w)}
                  cy={px(node.y, dims.h)}
                  r={node.radius + 6}
                  fill="none"
                  stroke="black"
                  strokeWidth="0.5"
                  animate={{ opacity: [0.05, 0.2, 0.05], r: [node.radius + 4, node.radius + 10, node.radius + 4] }}
                  transition={{ duration: 3 + node.delay, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Star dot */}
                <circle
                  cx={px(node.x, dims.w)}
                  cy={px(node.y, dims.h)}
                  r={node.radius}
                  fill="black"
                  opacity={0.15 + (node.count / (analysis.topTags[0]?.count || 1)) * 0.75}
                />
                {/* Label */}
                <motion.text
                  x={px(node.x, dims.w)}
                  y={px(node.y, dims.h) + node.radius + 14}
                  textAnchor="middle"
                  fontSize={10 + (node.count / (analysis.topTags[0]?.count || 1)) * 6}
                  fontFamily="system-ui, sans-serif"
                  fontWeight="300"
                  fill="black"
                  opacity={0.4 + (node.count / (analysis.topTags[0]?.count || 1)) * 0.5}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 + (node.count / (analysis.topTags[0]?.count || 1)) * 0.5 }}
                  transition={{ delay: 0.5 + i * 0.07 }}
                >
                  {node.tag}
                </motion.text>
              </motion.g>
            ))}
          </svg>
        )}
      </div>

      {/* Active node detail */}
      {activeNode && (
        <motion.div
          key={activeNode.tag}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-28 left-0 right-0 flex justify-center z-20 pointer-events-none"
        >
          <div className="bg-black text-white px-4 py-2 rounded-full text-sm">
            <span className="font-medium">{activeNode.tag}</span>
            <span className="ml-2 opacity-50 text-xs">
              {activeNode.count} {activeNode.count === 1 ? 'time' : 'times'}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
