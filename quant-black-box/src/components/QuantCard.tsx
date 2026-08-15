import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import type { MouseEvent } from 'react'

const TILT = 12

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

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.045, z: 60 }}
      style={{ rotateX, rotateY }}
      className="group relative flex h-[240px] w-[min(100%,340px)] cursor-pointer items-stretch rounded border border-line bg-panel text-left shadow-[0_0_0_rgba(0,0,0,0)] transition-[border-color,box-shadow] duration-300 hover:border-white/25 hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)] [transform-style:preserve-3d]"
    >
      <div
        className="absolute -inset-2.5 rounded-lg border border-border/30 bg-black/40"
        style={{ transform: 'translateZ(-46px)' }}
      />
      <div
        className="absolute inset-0 rounded opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          transform: 'translateZ(-30px)',
          background: `radial-gradient(360px 200px at 50% 130%, ${accent}33, transparent 70%)`,
        }}
      />
      <div
        className="absolute left-0 right-0 top-0 h-px bg-white/0 transition-colors duration-300 group-hover:bg-white/40"
        style={{ transform: 'translateZ(2px)' }}
      />

      <div
        className="relative flex w-full flex-col justify-between p-5"
        style={{ transform: 'translateZ(34px)', transformStyle: 'preserve-3d' }}
      >
        <div className="flex items-center justify-between" style={{ transform: 'translateZ(10px)' }}>
          <span className="font-mono text-[10px] tracking-[0.2em] text-mute">{code} / MODULE</span>
          <span
            className="h-1.5 w-1.5 rounded-full bg-green opacity-30 transition-opacity duration-300 group-hover:opacity-100"
            style={{ boxShadow: `0 0 8px ${accent}` }}
          />
        </div>

        <div className="mt-3" style={{ transform: 'translateZ(22px)' }}>
          <div className="font-mono text-[24px] font-bold leading-none tracking-[0.06em]" style={{ color: accent }}>
            {short}
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">{label}</div>
        </div>

        <div className="mt-3" style={{ transform: 'translateZ(14px)' }}>
          <p className="text-[10px] leading-relaxed text-mute">{tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {metrics.map((m) => (
              <span
                key={m}
                className="rounded border border-line px-1.5 py-[3px] font-mono text-[8px] tracking-[0.1em] text-label transition-colors duration-300 group-hover:border-border group-hover:text-white"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3" style={{ transform: 'translateZ(8px)' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-mute transition-colors duration-300 group-hover:text-white">
            Launch Model
          </span>
          <span
            className="font-mono text-[12px] transition-transform duration-300 group-hover:translate-x-0.5"
            style={{ color: accent }}
          >
            →
          </span>
        </div>
      </div>
    </motion.button>
  )
}
