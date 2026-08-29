import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import type { MouseEvent } from 'react'

const TILT = 14

interface QuantCardProps {
  code: string
  short: string
  label: string
  tagline: string
  metrics: string[]
  accent: string
  delay: number
  onOpen: () => void
}

function MiniSparkline({ accent }: { accent: string }) {
  const points = 'M0,28 L8,24 L16,26 L24,18 L32,20 L40,12 L48,14 L56,8 L64,10 L72,4 L80,6 L88,2 L96,4 L104,1'
  const gridLines = [8, 16, 24, 32]

  return (
    <svg
      viewBox="0 0 104 32"
      className="absolute bottom-0 right-0 h-[60px] w-[120px] opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.15]"
      preserveAspectRatio="none"
    >
      {gridLines.map((y) => (
        <line key={y} x1="0" y1={y} x2="104" y2={y} stroke="white" strokeWidth="0.3" opacity="0.3" />
      ))}
      <path
        d={points}
        fill="none"
        stroke={accent}
        strokeWidth="1.2"
        strokeLinecap="round"
        className="sparkline-path"
      />
      <circle cx="104" cy="1" r="1.5" fill={accent} opacity="0.6" />
    </svg>
  )
}

function MiniWireframe({ accent }: { accent: string }) {
  const rows = 5
  const cols = 7
  const lines: string[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 6 + c * 14
      const y = 4 + r * 6
      const z = Math.sin(c * 0.8 + r * 0.5) * 3
      if (c < cols - 1) {
        const nx = 6 + (c + 1) * 14
        const nz = Math.sin((c + 1) * 0.8 + r * 0.5) * 3
        lines.push(`M${x},${y + z} L${nx},${y + nz}`)
      }
      if (r < rows - 1) {
        const ny = 4 + (r + 1) * 6
        const nz2 = Math.sin(c * 0.8 + (r + 1) * 0.5) * 3
        lines.push(`M${x},${y + z} L${x},${ny + nz2}`)
      }
    }
  }

  return (
    <svg
      viewBox="0 0 104 36"
      className="absolute bottom-1 right-1 h-[50px] w-[100px] opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.14]"
      preserveAspectRatio="none"
    >
      {lines.map((d, i) => (
        <path key={i} d={d} stroke={accent} strokeWidth="0.4" fill="none" opacity={0.5 + (i % 3) * 0.15} />
      ))}
    </svg>
  )
}

const VISUALIZERS: Record<string, React.FC<{ accent: string }>> = {
  '01': MiniSparkline,
  '02': MiniWireframe,
  '03': MiniSparkline,
  '04': MiniWireframe,
  '05': MiniSparkline,
}

export default function QuantCard({ code, short, label, tagline, metrics, accent, delay, onOpen }: QuantCardProps) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const spring = { stiffness: 220, damping: 18 }

  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [TILT, -TILT]), spring)
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-TILT, TILT]), spring)

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleLeave = () => {
    mx.set(0)
    my.set(0)
  }

  const Vis = VISUALIZERS[code] ?? MiniSparkline
  const glowClass = `glow-${code === '01' ? 'bs' : code === '02' ? 'heston' : code === '03' ? 'bl' : code === '04' ? 'mc' : 'apt'}`

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.03, z: 60 }}
      style={{ rotateX, rotateY }}
      className={`group glass-card relative flex h-[260px] w-[min(100%,340px)] cursor-pointer items-stretch rounded-lg text-left [transform-style:preserve-3d] ${glowClass}`}
    >
      {/* Back layer - depth offset */}
      <div
        className="absolute -inset-3 rounded-xl border border-zinc-800/30 bg-black/30"
        style={{ transform: 'translateZ(-50px)' }}
      />

      {/* Radial accent glow on hover */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{
          transform: 'translateZ(-30px)',
          background: `radial-gradient(380px 220px at 50% 120%, ${accent}20, transparent 70%)`,
        }}
      />

      {/* Top edge highlight */}
      <div
        className="absolute left-0 right-0 top-0 h-px bg-white/0 transition-colors duration-300 group-hover:bg-white/20"
        style={{ transform: 'translateZ(2px)' }}
      />

      {/* Mini visualizer in background */}
      <div style={{ transform: 'translateZ(-20px)' }}>
        <Vis accent={accent} />
      </div>

      {/* Content */}
      <div
        className="relative flex w-full flex-col justify-between p-5"
        style={{ transform: 'translateZ(34px)', transformStyle: 'preserve-3d' }}
      >
        {/* Header row: pill badge + status dot */}
        <div className="flex items-center justify-between" style={{ transform: 'translateZ(10px)' }}>
          <span
            className="module-pill"
            style={{
              background: `${accent}18`,
              color: accent,
              border: `1px solid ${accent}30`,
            }}
          >
            <span style={{ opacity: 0.5 }}>/</span>
            {code} / {short}
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full transition-opacity duration-300 opacity-30 group-hover:opacity-100"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}80` }}
          />
        </div>

        {/* Title block */}
        <div className="mt-4" style={{ transform: 'translateZ(22px)' }}>
          <div className="font-mono text-[26px] font-bold leading-none tracking-[0.04em]" style={{ color: accent }}>
            {short}
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            {label}
          </div>
        </div>

        {/* Description + metric chips */}
        <div className="mt-3" style={{ transform: 'translateZ(14px)' }}>
          <p className="text-[10px] leading-relaxed text-zinc-500">{tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {metrics.map((m) => (
              <span
                key={m}
                className="rounded-md border border-zinc-800/80 bg-zinc-900/50 px-2 py-[3px] font-mono text-[8px] font-medium tracking-[0.08em] text-zinc-400 transition-all duration-300 group-hover:border-zinc-700 group-hover:text-zinc-200"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Footer: launch action */}
        <div
          className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3"
          style={{ transform: 'translateZ(8px)' }}
        >
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600 transition-colors duration-300 group-hover:text-zinc-300">
            Launch Model
          </span>
          <span
            className="card-launch-arrow font-mono text-[13px]"
            style={{ color: accent }}
          >
            →
          </span>
        </div>
      </div>
    </motion.button>
  )
}
