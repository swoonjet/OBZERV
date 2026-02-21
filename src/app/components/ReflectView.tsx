import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react'
import { storage } from '../utils/storage'
import { analyzeReflections, ReflectAnalysis } from '../utils/reflect'

// ─── Colour helpers ──────────────────────────────────────────────────────────

/**
 * Map valence (-1…+1) → a colour.
 * Negative = cool slate blue, zero = warm grey, positive = amber/gold.
 */
function valenceToColor(v: number, alpha = 1): string {
  // negative pole: slate blue  rgb(100, 116, 139)
  // zero:          warm grey   rgb(156, 148, 140)
  // positive pole: amber       rgb(217, 170, 80)
  const t = (v + 1) / 2 // 0…1
  const r = lerp(lerp(100, 156, Math.min(t * 2, 1)), lerp(156, 217, Math.max((t - 0.5) * 2, 0)), t > 0.5 ? 1 : 0)
  const g = lerp(lerp(116, 148, Math.min(t * 2, 1)), lerp(148, 170, Math.max((t - 0.5) * 2, 0)), t > 0.5 ? 1 : 0)
  const b = lerp(lerp(139, 140, Math.min(t * 2, 1)), lerp(140, 80, Math.max((t - 0.5) * 2, 0)), t > 0.5 ? 1 : 0)

  // simpler: just interpolate directly
  const r2 = t < 0.5 ? lerp(100, 156, t * 2) : lerp(156, 217, (t - 0.5) * 2)
  const g2 = t < 0.5 ? lerp(116, 148, t * 2) : lerp(148, 170, (t - 0.5) * 2)
  const b2 = t < 0.5 ? lerp(139, 140, t * 2) : lerp(140, 80, (t - 0.5) * 2)

  void r; void g; void b
  return `rgba(${Math.round(r2)}, ${Math.round(g2)}, ${Math.round(b2)}, ${alpha})`
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

// ─── Breathing form ───────────────────────────────────────────────────────────

/**
 * Generates an SVG path for an organic blob using polar coordinates.
 * `expansion` (0…1) controls the overall scale.
 * `valence` shifts the number of lobes (open = more points, closed = fewer).
 */
function blobPath(
  cx: number,
  cy: number,
  baseR: number,
  expansion: number,
  valence: number,
  t: number,   // time offset for animation
): string {
  const points = 120
  const coords: [number, number][] = []
  const lobes = 3 + Math.round((valence + 1) * 1.5) // 3-6 lobes based on valence
  const wobble = 0.08 + expansion * 0.12

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const noise =
      Math.sin(angle * lobes + t * 0.6) * wobble +
      Math.sin(angle * (lobes + 1) + t * 0.4) * (wobble * 0.5) +
      Math.sin(angle * 2 + t * 0.2) * (wobble * 0.3)
    const r = baseR * (0.85 + expansion * 0.25 + noise)
    coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
  }

  return (
    `M ${coords[0][0].toFixed(2)} ${coords[0][1].toFixed(2)} ` +
    coords
      .slice(1)
      .map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`)
      .join(' ') +
    ' Z'
  )
}

interface BreathingFormProps {
  valence: number
  distance: number
  loading: boolean
}

function BreathingForm({ valence, distance, loading }: BreathingFormProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const animRef = useRef<number>(0)
  const tRef = useRef(0)

  // Smooth the valence/distance so transitions feel organic
  const smoothValence = useRef(valence)
  const smoothDistance = useRef(distance)

  useEffect(() => {
    const svg = svgRef.current
    const pathEl = pathRef.current
    if (!svg || !pathEl) return

    const draw = (ts: number) => {
      animRef.current = requestAnimationFrame(draw)
      tRef.current = ts * 0.001

      // Ease toward target values
      smoothValence.current += (valence - smoothValence.current) * 0.02
      smoothDistance.current += (distance - smoothDistance.current) * 0.02

      const w = svg.clientWidth || 300
      const h = svg.clientHeight || 300
      const cx = w / 2
      const cy = h / 2
      const baseR = Math.min(w, h) * 0.33

      const d = blobPath(cx, cy, baseR, smoothDistance.current, smoothValence.current, tRef.current)
      pathEl.setAttribute('d', d)
      pathEl.setAttribute('fill', valenceToColor(smoothValence.current, loading ? 0.15 : 0.22))
      pathEl.setAttribute('stroke', valenceToColor(smoothValence.current, loading ? 0.25 : 0.5))
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [valence, distance, loading])

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ overflow: 'visible' }}
    >
      {/* Soft outer glow */}
      <defs>
        <filter id="blob-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        ref={pathRef}
        strokeWidth="1.5"
        filter="url(#blob-glow)"
        style={{ transition: 'fill 2s ease, stroke 2s ease' }}
      />
    </svg>
  )
}

// ─── Terrain view ─────────────────────────────────────────────────────────────

interface TerrainPoint {
  x: number        // pixel x
  elevation: number // conceptualDistance (0–1)
  valence: number  // -1 to 1
  timestamp: number
  summary: string
}

interface TerrainProps {
  points: TerrainPoint[]
  width: number
  height: number
}

function Terrain({ points, width, height }: TerrainProps) {
  const [hovered, setHovered] = useState<TerrainPoint | null>(null)
  if (points.length === 0 || width === 0) return null

  const padTop = 24
  const padBottom = 32
  const usableH = height - padTop - padBottom

  // Build SVG path for the terrain line
  const toY = (elev: number) => padTop + usableH * (1 - elev)

  const pts = points.map((p) => ({ ...p, svgY: toY(p.elevation) }))

  // Smooth curve through points using cardinal spline approximation
  const curvePath = (() => {
    if (pts.length < 2) return ''
    const parts: string[] = [`M ${pts[0].x.toFixed(1)} ${pts[0].svgY.toFixed(1)}`]
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[Math.min(i + 2, pts.length - 1)]
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.svgY + (p2.svgY - p0.svgY) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.svgY - (p3.svgY - p1.svgY) / 6
      parts.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.svgY.toFixed(1)}`)
    }
    return parts.join(' ')
  })()

  // Fill path (close to bottom)
  const fillPath = curvePath
    ? `${curvePath} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`
    : ''

  return (
    <div className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="absolute inset-0">
        <defs>
          <linearGradient id="terrain-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={valenceToColor(
              points.reduce((s, p) => s + p.valence, 0) / points.length, 0.3
            )} />
            <stop offset="100%" stopColor={valenceToColor(
              points.reduce((s, p) => s + p.valence, 0) / points.length, 0.02
            )} />
          </linearGradient>
        </defs>

        {/* Fill under curve */}
        {fillPath && (
          <motion.path
            d={fillPath}
            fill="url(#terrain-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          />
        )}

        {/* Terrain line */}
        {curvePath && (
          <motion.path
            d={curvePath}
            fill="none"
            stroke={valenceToColor(
              points.reduce((s, p) => s + p.valence, 0) / points.length, 0.7
            )}
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
          />
        )}

        {/* Data point dots */}
        {pts.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.svgY}
            r={hovered === p ? 5 : 3}
            fill={valenceToColor(p.valence, 0.8)}
            stroke="white"
            strokeWidth="1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.04, duration: 0.4 }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(p)}
            onMouseLeave={() => setHovered(null)}
            onTouchStart={() => setHovered(p)}
          />
        ))}

        {/* Axis labels */}
        <text x={4} y={padTop - 6} fontSize={9} fill="#9ca3af" fontFamily="system-ui" letterSpacing="0.08em">
          EXPANSIVE
        </text>
        <text x={4} y={height - 4} fontSize={9} fill="#9ca3af" fontFamily="system-ui" letterSpacing="0.08em">
          FOCUSED
        </text>
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none z-20"
          >
            <div
              className="px-3 py-2 rounded-xl text-xs max-w-[220px] text-center shadow-lg"
              style={{
                background: valenceToColor(hovered.valence, 0.12),
                border: `1px solid ${valenceToColor(hovered.valence, 0.3)}`,
                color: '#1f2937',
                backdropFilter: 'blur(8px)',
              }}
            >
              {hovered.summary && <p className="mb-1 text-gray-700">{hovered.summary}</p>}
              <p className="text-gray-400 text-[10px]">
                {new Date(hovered.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

type LoadState = 'idle' | 'loading' | 'done' | 'error' | 'no-key'

export function ReflectView() {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [analysis, setAnalysis] = useState<ReflectAnalysis | null>(null)
  const [terrainWidth, setTerrainWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasKey = !!import.meta.env.VITE_ANTHROPIC_KEY

  const load = useCallback(async () => {
    if (!hasKey) { setLoadState('no-key'); return }
    setLoadState('loading')
    try {
      const observations = await storage.getObservations()
      if (observations.length === 0) {
        setLoadState('done')
        setAnalysis({
          reflections: [],
          overallValence: 0,
          overallDistance: 0.5,
          narrativeSummary: '',
        })
        return
      }
      const result = await analyzeReflections(observations)
      setAnalysis(result)
      setLoadState('done')
    } catch (e) {
      console.error('reflect error', e)
      setLoadState('error')
    }
  }, [hasKey])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setTerrainWidth(containerRef.current.offsetWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Spring-smooth the overall values for the breathing form
  const valenceSpring = useSpring(0, { stiffness: 20, damping: 8 })
  const distanceSpring = useSpring(0.5, { stiffness: 20, damping: 8 })
  const [springValence, setSpringValence] = useState(0)
  const [springDistance, setSpringDistance] = useState(0.5)

  useEffect(() => {
    if (analysis) {
      valenceSpring.set(analysis.overallValence)
      distanceSpring.set(analysis.overallDistance)
    }
  }, [analysis, valenceSpring, distanceSpring])

  useEffect(() => {
    const unsubV = valenceSpring.on('change', setSpringValence)
    const unsubD = distanceSpring.on('change', setSpringDistance)
    return () => { unsubV(); unsubD() }
  }, [valenceSpring, distanceSpring])

  // Build terrain points (oldest → newest, left → right)
  const terrainPoints: TerrainPoint[] = (() => {
    if (!analysis || analysis.reflections.length === 0 || terrainWidth === 0) return []
    const sorted = [...analysis.reflections].sort((a, b) => a.timestamp - b.timestamp)
    const pad = 32
    const span = terrainWidth - pad * 2
    return sorted.map((r, i) => ({
      x: pad + (i / Math.max(sorted.length - 1, 1)) * span,
      elevation: r.conceptualDistance,
      valence: r.valence,
      timestamp: r.timestamp,
      summary: r.summary,
    }))
  })()

  const accentColor = valenceToColor(springValence, 1)
  const loading = loadState === 'loading'

  return (
    <div className="min-h-screen pb-24 bg-white overflow-hidden">

      {/* ── Breathing form section ── */}
      <div className="relative flex flex-col items-center pt-10 pb-6 px-6">

        {/* Title */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[10px] uppercase tracking-widest text-gray-400 mb-6"
        >
          Reflect
        </motion.p>

        {/* Blob container */}
        <div className="relative w-64 h-64">
          <BreathingForm
            valence={springValence}
            distance={springDistance}
            loading={loading}
          />

          {/* Centre state label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="text-[10px] uppercase tracking-widest text-gray-400"
                >
                  Reading…
                </motion.div>
              ) : loadState === 'no-key' ? (
                <motion.div
                  key="nokey"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center px-6"
                >
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Add <code className="bg-gray-100 px-1 rounded">VITE_ANTHROPIC_KEY</code> to enable AI reflection
                  </p>
                </motion.div>
              ) : loadState === 'error' ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center px-6"
                >
                  <p className="text-xs text-gray-400">Analysis unavailable</p>
                  <button
                    onClick={load}
                    className="mt-2 text-xs underline text-gray-500"
                  >
                    Retry
                  </button>
                </motion.div>
              ) : analysis && analysis.reflections.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-gray-400 text-center px-8"
                >
                  Record observations to see your reflection
                </motion.p>
              ) : analysis ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <p
                    className="text-2xl font-light tabular-nums"
                    style={{ color: accentColor }}
                  >
                    {springValence > 0.2 ? 'Open' : springValence < -0.2 ? 'Closed' : 'Steady'}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">
                    {springDistance > 0.6 ? 'Wide-ranging' : springDistance < 0.35 ? 'Focused' : 'Balanced'}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Colour legend — appears only when loaded */}
        <AnimatePresence>
          {loadState === 'done' && analysis && analysis.reflections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex gap-6 mt-5"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: valenceToColor(-1, 0.7) }} />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Closed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: valenceToColor(0, 0.7) }} />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Neutral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: valenceToColor(1, 0.7) }} />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Open</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Narrative summary ── */}
      <AnimatePresence>
        {loadState === 'done' && analysis?.narrativeSummary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="px-8 pb-6"
          >
            <div
              className="rounded-2xl px-5 py-4"
              style={{
                background: valenceToColor(springValence, 0.06),
                borderLeft: `3px solid ${valenceToColor(springValence, 0.4)}`,
              }}
            >
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                {analysis.narrativeSummary}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Terrain view ── */}
      <AnimatePresence>
        {loadState === 'done' && terrainPoints.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="px-6 pb-4"
            ref={containerRef}
          >
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">
              Conceptual range over time
            </p>
            <Terrain
              points={terrainPoints}
              width={terrainWidth}
              height={120}
            />
            <div className="flex justify-between mt-2">
              <p className="text-[10px] text-gray-300">Earlier</p>
              <p className="text-[10px] text-gray-300">Recent</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
