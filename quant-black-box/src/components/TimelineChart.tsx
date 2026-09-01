import { useCallback, useRef } from 'react'
import { Line, LineChart, ReferenceDot, ResponsiveContainer, YAxis } from 'recharts'
import type { CandleRow } from '../lib/marketApi'

interface TimelineChartProps {
  candles: CandleRow[]
  currentStep: number
  onSeek: (step: number) => void
}

export default function TimelineChart({ candles, currentStep, onSeek }: TimelineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || candles.length === 0) return
      const x = e.clientX - rect.left
      const ratio = x / rect.width
      const step = Math.max(0, Math.min(candles.length - 1, Math.round(ratio * (candles.length - 1))))
      onSeek(step)
    },
    [candles.length, onSeek],
  )

  const current = candles[currentStep]
  const data = candles.map((c, i) => ({ idx: i, close: c.close }))

  return (
    <div ref={containerRef} className="h-[60px] cursor-pointer" onClick={handleClick}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <YAxis domain={['auto', 'auto']} hide />
          <Line type="monotone" dataKey="close" stroke="#555" strokeWidth={1} dot={false} isAnimationActive={false} />
          {current && (
            <ReferenceDot x={currentStep} y={current.close} r={3} fill="#10b981" stroke="#10b981" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
