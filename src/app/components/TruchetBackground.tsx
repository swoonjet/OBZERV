import { useEffect, useRef } from 'react'

const TILE_SIZE = 80
const COLORS = {
  pink: 'rgba(255, 182, 193, 0.18)',   // soft pink, low opacity
  green: 'rgba(144, 238, 144, 0.15)',  // soft green, low opacity
  stroke: 'rgba(200, 200, 200, 0.08)', // barely-there grid lines
}

type Tile = {
  rotation: number   // 0, 90, 180, 270
  color: string
}

function drawTruchetTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tile: Tile,
) {
  ctx.save()
  ctx.translate(x + size / 2, y + size / 2)
  ctx.rotate((tile.rotation * Math.PI) / 180)
  ctx.translate(-size / 2, -size / 2)

  ctx.strokeStyle = tile.color
  ctx.lineWidth = size * 0.55
  ctx.lineCap = 'round'

  // Two quarter-circle arcs — the classic Truchet tile
  ctx.beginPath()
  ctx.arc(0, 0, size / 2, 0, Math.PI / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(size, size, size / 2, Math.PI, (3 * Math.PI) / 2)
  ctx.stroke()

  ctx.restore()
}

function buildGrid(cols: number, rows: number): Tile[] {
  const rotations = [0, 90, 180, 270]
  const colorChoices = [COLORS.pink, COLORS.green]
  const grid: Tile[] = []
  for (let i = 0; i < cols * rows; i++) {
    grid.push({
      rotation: rotations[Math.floor(Math.random() * rotations.length)],
      color: colorChoices[Math.floor(Math.random() * colorChoices.length)],
    })
  }
  return grid
}

export function TruchetBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef<Tile[]>([])
  const animRef = useRef<number>(0)
  const lastFlipRef = useRef<number>(0)
  const timeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols = 0
    let rows = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      cols = Math.ceil(canvas.width / TILE_SIZE) + 1
      rows = Math.ceil(canvas.height / TILE_SIZE) + 1
      gridRef.current = buildGrid(cols, rows)
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = (ts: number) => {
      animRef.current = requestAnimationFrame(draw)

      // Gently rotate one random tile every ~2.5 seconds
      if (ts - lastFlipRef.current > 2500) {
        lastFlipRef.current = ts
        const idx = Math.floor(Math.random() * gridRef.current.length)
        const rotations = [0, 90, 180, 270]
        gridRef.current[idx] = {
          ...gridRef.current[idx],
          rotation: rotations[Math.floor(Math.random() * rotations.length)],
        }
      }

      timeRef.current = ts

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Slow, very subtle pan offset
      const offsetX = (Math.sin(ts * 0.00008) * TILE_SIZE) / 2
      const offsetY = (Math.cos(ts * 0.00006) * TILE_SIZE) / 2

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tile = gridRef.current[row * cols + col]
          if (!tile) continue
          drawTruchetTile(
            ctx,
            col * TILE_SIZE - TILE_SIZE / 2 + offsetX,
            row * TILE_SIZE - TILE_SIZE / 2 + offsetY,
            TILE_SIZE,
            tile,
          )
        }
      }
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
