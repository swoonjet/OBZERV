import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { storage } from '../utils/storage';
import { analyzeObservations } from '../utils/analysis';
import { PatternAnalysis } from '../types/observation';

// Seeded pseudo-random for stable positions across renders
function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface WordNode {
  tag: string;
  count: number;
  size: number;       // font size in px
  opacity: number;
  x: number;          // % from left
  y: number;          // % from top
  delay: number;
  duration: number;   // breath cycle duration
}

function buildWordNodes(topTags: PatternAnalysis['topTags']): WordNode[] {
  if (topTags.length === 0) return [];
  const maxCount = topTags[0].count;

  return topTags.slice(0, 20).map((item, i) => {
    const ratio = item.count / maxCount;
    const size = 13 + ratio * 36; // 13px–49px
    const opacity = 0.25 + ratio * 0.75; // 0.25–1.0

    // Distribute across canvas avoiding centre dead zone
    const angle = (i / topTags.length) * Math.PI * 2;
    const spread = 0.28 + seededRandom(i * 3) * 0.2;
    const cx = 50 + Math.cos(angle) * spread * 80;
    const cy = 50 + Math.sin(angle) * spread * 55;

    // Clamp within safe margins
    const x = Math.min(Math.max(cx, 6), 92);
    const y = Math.min(Math.max(cy, 8), 88);

    return {
      tag: item.tag,
      count: item.count,
      size,
      opacity,
      x,
      y,
      delay: seededRandom(i * 7) * 3,
      duration: 3 + seededRandom(i * 11) * 4, // 3s–7s
    };
  });
}

export function PatternsView() {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null);
  const [words, setWords] = useState<WordNode[]>([]);
  const [activeWord, setActiveWord] = useState<WordNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storage.getObservations().then((observations) => {
      const patterns = analyzeObservations(observations);
      setAnalysis(patterns);
      setWords(buildWordNodes(patterns.topTags));
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

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden bg-white select-none">

      {/* Ambient stats — quiet, top corners */}
      <div className="absolute top-5 left-5 z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-left"
        >
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Observations</p>
          <p className="text-3xl font-light text-gray-800">{analysis.totalObservations}</p>
        </motion.div>
      </div>

      <div className="absolute top-5 right-5 z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-right"
        >
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Per Day</p>
          <p className="text-3xl font-light text-gray-800">{analysis.averagePerDay}</p>
        </motion.div>
      </div>

      {/* Word cloud canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 bottom-24"
      >
        {words.map((word, i) => (
          <motion.button
            key={word.tag}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 font-light tracking-wide cursor-pointer"
            style={{
              left: `${word.x}%`,
              top: `${word.y}%`,
              fontSize: `${word.size}px`,
              color: `rgba(0,0,0,${word.opacity})`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [word.opacity * 0.7, word.opacity, word.opacity * 0.7],
              scale: [0.97, 1.03, 0.97],
            }}
            transition={{
              opacity: {
                duration: word.duration,
                repeat: Infinity,
                delay: word.delay,
                ease: 'easeInOut',
              },
              scale: {
                duration: word.duration,
                repeat: Infinity,
                delay: word.delay,
                ease: 'easeInOut',
              },
              // entry animation
              default: { delay: i * 0.08, duration: 0.6 },
            }}
            whileHover={{ scale: 1.15, opacity: 1 }}
            onHoverStart={() => setActiveWord(word)}
            onHoverEnd={() => setActiveWord(null)}
            onClick={() => setActiveWord(activeWord?.tag === word.tag ? null : word)}
          >
            {word.tag}
          </motion.button>
        ))}
      </div>

      {/* Active word detail — floats at bottom centre */}
      {activeWord && (
        <motion.div
          key={activeWord.tag}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-28 left-0 right-0 flex justify-center z-20 pointer-events-none"
        >
          <div className="bg-black text-white px-4 py-2 rounded-full text-sm">
            <span className="font-medium">{activeWord.tag}</span>
            <span className="ml-2 opacity-60 text-xs">
              {activeWord.count} {activeWord.count === 1 ? 'time' : 'times'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Location strip — whisper quiet at bottom */}
      {analysis.topLocations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-24 left-0 right-0 px-6 pb-2 z-10"
        >
          <p className="text-[10px] uppercase tracking-widest text-gray-300 mb-1 text-center">
            Where you observe
          </p>
          <div className="flex justify-center flex-wrap gap-x-4 gap-y-1">
            {analysis.topLocations.slice(0, 3).map((loc) => (
              <span key={loc.location} className="text-xs text-gray-400 truncate max-w-[140px]">
                {loc.location}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
