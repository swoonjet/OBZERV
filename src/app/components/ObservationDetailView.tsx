import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  MapPin,
  Clock,
  Tag,
  Share2,
  Trash2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../utils/storage';
import { Observation } from '../types/observation';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ─── Card renderer ────────────────────────────────────────────────────────────

async function renderObservationCard(observation: Observation): Promise<Blob> {
  const W = 1080
  const H = 1350 // 4:5 portrait — ideal for Instagram
  const PAD = 80

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background — warm off-white
  ctx.fillStyle = '#faf9f7'
  ctx.fillRect(0, 0, W, H)

  // Subtle top accent bar
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, W, 6)

  // OBZERV wordmark — top left
  ctx.fillStyle = '#1a1a1a'
  ctx.font = `300 28px -apple-system, "SF Pro Text", Helvetica, sans-serif`
  ctx.letterSpacing = '0.25em'
  ctx.fillText('OBZERV', PAD, PAD + 28)

  // Date — top right
  const dateStr = format(observation.timestamp, 'MMM d, yyyy')
  ctx.font = `300 24px -apple-system, "SF Pro Text", Helvetica, sans-serif`
  ctx.fillStyle = '#999'
  ctx.textAlign = 'right'
  ctx.fillText(dateStr, W - PAD, PAD + 28)
  ctx.textAlign = 'left'

  // Divider
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, PAD + 60)
  ctx.lineTo(W - PAD, PAD + 60)
  ctx.stroke()

  // Transcript — main body
  const maxWidth = W - PAD * 2
  const lineHeight = 68
  const fontSize = 44
  ctx.font = `300 ${fontSize}px -apple-system, "SF Pro Text", Helvetica, sans-serif`
  ctx.fillStyle = '#1a1a1a'

  const words = observation.transcript.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)

  // Vertically centre the text block
  const maxLines = Math.min(lines.length, 14)
  const blockH = maxLines * lineHeight
  const startY = Math.max(PAD + 100, (H - blockH) / 2 - 40)

  for (let i = 0; i < maxLines; i++) {
    const y = startY + i * lineHeight
    if (y + lineHeight > H - PAD - 120) {
      // Truncate with ellipsis
      ctx.fillText(lines[i].slice(0, -3) + '…', PAD, y)
      break
    }
    ctx.fillText(lines[i], PAD, y)
  }

  // Tags — bottom section
  if (observation.tags.length > 0) {
    const tagY = H - PAD - 80
    ctx.font = `300 24px -apple-system, "SF Pro Text", Helvetica, sans-serif`
    ctx.fillStyle = '#999'
    const tagLine = observation.tags.slice(0, 5).map((t) => `#${t}`).join('  ')
    ctx.fillText(tagLine, PAD, tagY)
  }

  // Bottom divider + location
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, H - PAD - 40)
  ctx.lineTo(W - PAD, H - PAD - 40)
  ctx.stroke()

  if (observation.location?.address) {
    ctx.font = `300 20px -apple-system, "SF Pro Text", Helvetica, sans-serif`
    ctx.fillStyle = '#bbb'
    ctx.fillText(`📍 ${observation.location.address}`, PAD, H - PAD)
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ObservationDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [observation, setObservation] = useState<Observation | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    if (id) {
      storage.getObservations().then((observations) => {
        const found = observations.find((o) => o.id === id);
        setObservation(found || null);
      });
    }
  }, [id]);

  const handleDelete = async () => {
    if (observation && confirm('Delete this observation?')) {
      await storage.deleteObservation(observation.id);
      toast.success('Observation deleted');
      navigate('/observations');
    }
  };

  const handleShareCard = async () => {
    if (!observation || sharing) return
    setSharing(true)
    setShowShareSheet(false)
    try {
      const blob = await renderObservationCard(observation)
      const file = new File([blob], 'observation.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'OBZERV' })
      } else if (navigator.share) {
        // Fallback: share text only
        await navigator.share({
          title: 'OBZERV',
          text: observation.transcript,
        })
      } else {
        // Desktop fallback: download the card
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `obzerv-${format(observation.timestamp, 'yyyy-MM-dd')}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Card saved')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Could not share')
    } finally {
      setSharing(false)
    }
  }

  const handleCopyText = () => {
    if (!observation) return
    const text = [
      observation.transcript,
      observation.location?.address ? `\n📍 ${observation.location.address}` : '',
      `\n— ${format(observation.timestamp, 'PPp')}`,
      '\n\nobzerv.app',
    ].join('')
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
    setShowShareSheet(false)
  }

  const openInMaps = () => {
    if (observation?.location) {
      const url = `https://www.google.com/maps?q=${observation.location.latitude},${observation.location.longitude}`;
      window.open(url, '_blank');
    }
  };

  if (!observation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Observation not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <button
            onClick={() => navigate('/observations')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setShowShareSheet(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Timestamp */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 text-sm text-gray-500 mb-4"
        >
          <Clock className="w-4 h-4" />
          <span>{format(observation.timestamp, 'EEEE, MMMM d, yyyy')}</span>
          <span>•</span>
          <span>{format(observation.timestamp, 'h:mm a')}</span>
        </motion.div>

        {/* Transcript */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-lg p-6 mb-4"
        >
          <p className="text-gray-800 leading-relaxed text-lg whitespace-pre-wrap">
            {observation.transcript}
          </p>
        </motion.div>

        {/* Location */}
        {observation.location && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-50 rounded-lg p-4 mb-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800 mb-1">Location</p>
                  <p className="text-sm text-gray-600">
                    {observation.location.address || 'Location captured'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {observation.location.latitude.toFixed(6)},{' '}
                    {observation.location.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              <button
                onClick={openInMaps}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Tags */}
        {observation.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-800 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {observation.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Duration */}
        {observation.duration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-center text-sm text-gray-500"
          >
            Recording duration: {observation.duration} seconds
          </motion.div>
        )}
      </div>

      {/* ── Share Sheet ── */}
      <AnimatePresence>
        {showShareSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowShareSheet(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-6 pt-5 pb-10 max-w-lg mx-auto"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

              <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">
                Share
              </p>

              {/* Preview snippet */}
              <p className="text-sm text-gray-600 line-clamp-3 mb-6 leading-relaxed">
                {observation.transcript}
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleShareCard}
                  disabled={sharing}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-2xl">🖼</span>
                  <div>
                    <p className="font-medium text-gray-900">Share as image</p>
                    <p className="text-xs text-gray-500">Renders a clean card — great for Stories</p>
                  </div>
                  {sharing && (
                    <span className="ml-auto text-xs text-gray-400 animate-pulse">Rendering…</span>
                  )}
                </button>

                <button
                  onClick={handleCopyText}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="font-medium text-gray-900">Copy text</p>
                    <p className="text-xs text-gray-500">Paste anywhere</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
