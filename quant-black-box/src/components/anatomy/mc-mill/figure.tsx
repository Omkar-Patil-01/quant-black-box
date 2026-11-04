import { useMemo } from 'react'
import type { McSimulation, McStats } from '../../../lib/math'
import { Plate } from '../../iso/draw'
import { MillArt } from './art'
import { buildMill, NBINS, THREADS } from './model'
import '../../iso/iso.css'
import './mill.css'

interface Props {
  sim: McSimulation
  stats: McStats
  /** formats a terminal price in the active view (price / return / P&L) */
  fmt: (price: number) => string
  /** formats a ± span (one sd) in the active view */
  fmtDelta: (delta: number) => string
  /** engraved engine settings */
  config: string
  /** short axis name: PRICE / RETURN / P&L ($) */
  metricLabel: string
}

export function McMillFigure({ sim, stats, fmt, fmtDelta, config, metricLabel }: Props) {
  const model = useMemo(() => buildMill(sim), [sim])
  return (
    <div className="iso mcmill">
      <Plate
        fig="Fig 1"
        title="Path mill"
        hint="Grain falls into its bin"
        readout={`${fmt(stats.mean)} mean · ${fmt(stats.median)} median · ±${fmtDelta(stats.sd)} sd`}
        keys={[
          { mark: 'green', label: 'A sampled path, one per percentile' },
          { mark: 'flat', label: 'Grain: what each bin collected' },
          { mark: 'dim', label: 'Dividers, deck and engine frame' },
        ]}
        caption={
          `${sim.N} simulated paths milled into ${NBINS} bins between ${fmt(model.lo)} and ${fmt(model.hi)}. ` +
          `The ${THREADS} green threads are real paths at even percentiles — each leaves the engine mouth, runs the deck, ` +
          `and drops into the bin its own terminal price claims; grain height tracks that bin's count.`
        }
      >
        <MillArt model={model} config={config} metricLabel={metricLabel} fmt={fmt} />
      </Plate>
    </div>
  )
}
