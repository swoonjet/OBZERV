import { Observation } from '../types/observation'

export interface ObservationReflection {
  id: string
  timestamp: number
  valence: number          // -1 (closed/dark) to +1 (open/bright)
  conceptualDistance: number // 0 (tight/ruminating) to 1 (expansive)
  summary: string          // one-sentence character of this observation
}

export interface ReflectAnalysis {
  reflections: ObservationReflection[]
  overallValence: number
  overallDistance: number
  narrativeSummary: string // 2–3 sentence read of the recent arc
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Route through Supabase Edge Function to avoid CORS issues with direct Anthropic calls
async function callClaude(prompt: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/anthropic-proxy`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Proxy error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// Analyse a batch of observations in one API call
export async function analyzeReflections(
  observations: Observation[]
): Promise<ReflectAnalysis> {
  if (observations.length === 0) {
    return {
      reflections: [],
      overallValence: 0,
      overallDistance: 0.5,
      narrativeSummary: '',
    }
  }

  // Only send the most recent 20 to keep tokens low
  const recent = observations.slice(0, 20)

  const observationList = recent
    .map(
      (o, i) =>
        `[${i + 1}] (${new Date(o.timestamp).toLocaleDateString()}) "${o.transcript.slice(0, 300)}"`
    )
    .join('\n')

  const prompt = `You are analyzing a person's voice journal observations to help them reflect on their mental state and patterns of attention.

Here are their recent observations (most recent first):
${observationList}

Respond with ONLY valid JSON in exactly this shape — no markdown, no explanation:
{
  "reflections": [
    {
      "index": 1,
      "valence": 0.0,
      "conceptualDistance": 0.0,
      "summary": "one sentence"
    }
  ],
  "overallValence": 0.0,
  "overallDistance": 0.0,
  "narrativeSummary": "2-3 sentences describing the arc and character of this person's observations lately"
}

Rules:
- valence: a float from -1.0 (closed, anxious, ruminating, dark) to +1.0 (open, curious, joyful, expansive). 0 = neutral.
- conceptualDistance: a float from 0.0 (tight focus, one topic, ruminating) to 1.0 (wide-ranging, many different ideas, exploratory).
- overallValence: weighted average across all reflections, emphasising the most recent.
- overallDistance: weighted average of conceptualDistance values.
- narrativeSummary: warm, honest, non-clinical — written like a thoughtful friend, not a therapist.
- summary per observation: one crisp sentence describing its essential quality or mood.`

  let raw = ''
  try {
    raw = await callClaude(prompt)
    // Strip any accidental markdown fences
    raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(raw)

    const reflections: ObservationReflection[] = (parsed.reflections ?? []).map(
      (r: { index: number; valence: number; conceptualDistance: number; summary: string }, i: number) => ({
        id: recent[r.index - 1]?.id ?? String(i),
        timestamp: recent[r.index - 1]?.timestamp ?? 0,
        valence: clamp(r.valence, -1, 1),
        conceptualDistance: clamp(r.conceptualDistance, 0, 1),
        summary: r.summary ?? '',
      })
    )

    return {
      reflections,
      overallValence: clamp(parsed.overallValence ?? 0, -1, 1),
      overallDistance: clamp(parsed.overallDistance ?? 0.5, 0, 1),
      narrativeSummary: parsed.narrativeSummary ?? '',
    }
  } catch (err) {
    console.error('reflect parse error', err, raw)
    // Graceful fallback — neutral values
    return {
      reflections: recent.map((o) => ({
        id: o.id,
        timestamp: o.timestamp,
        valence: 0,
        conceptualDistance: 0.5,
        summary: '',
      })),
      overallValence: 0,
      overallDistance: 0.5,
      narrativeSummary: '',
    }
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}
