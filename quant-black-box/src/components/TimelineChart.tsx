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
  // Compute the Y domain here rather than passing 'auto': recharts' auto domain runs
  // its recursive getNiceTickValues, which can infinitely recurse ("Maximum call stack
  // size exceeded") on a large float dataset. An explicit numeric domain routes it to
  // the iterative getTickValuesFixedDomain instead. The axis is hidden, so this only
  // changes how the line maps to the 60px height (it now spans min..max exactly).
  let dataMin = Infinity
  let dataMax = -Infinity
  const data = candles.map((c, i) => {
    if (c.close < dataMin) dataMin = c.close
    if (c.close > dataMax) dataMax = c.close
    return { idx: i, close: c.close }
  })
  // Yahoo bars are external data; keep a valid span if the range is flat.
  if (dataMin === dataMax) {
    dataMin -= 1
    dataMax += 1
  }

  return (
    <div ref={containerRef} className="h-[60px] cursor-pointer" onClick={handleClick}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <YAxis domain={[dataMin, dataMax]} hide />
          <Line type="monotone" dataKey="close" stroke="#555" strokeWidth={1} dot={false} isAnimationActive={false} />
          {current && (
            <ReferenceDot x={currentStep} y={current.close} r={3} fill="#10b981" stroke="#10b981" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
