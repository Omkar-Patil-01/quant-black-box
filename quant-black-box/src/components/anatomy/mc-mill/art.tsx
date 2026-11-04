import { useMemo } from 'react'
import { Dots, FaceText, IsoFigure, Line, Solid } from '../../iso/draw'
import { buildGeometry, faceMat } from './geometry'
import { MillLive } from './live'
import { NBINS, type MillModel } from './model'
import { BASE_H, DECK_FACE, DECK_TOP, HEIGHT, HOP_FACE, HOP_Z, HOUSE_FACE, LABEL_Y, WIDTH, pt } from './view'

export interface ArtProps {
  model: MillModel
  /** run configuration, engraved on the housing: "μ 8.0% · σ 20.0% · N 1000 · seed …" */
  config: string
  /** short axis name: PRICE / RETURN / P&L */
  metricLabel: string
  fmt: (value: number) => string
}

/** text stacks downward along -z on a vertical face, along +y on the base */
const ON_WALL: [number, number, number] = [0, 0, -1]
const ON_FLOOR: [number, number, number] = [0, 1, 0]
const ADVANCE: [number, number, number] = [1, 0, 0]

export function MillArt({ model, config, metricLabel, fmt }: ArtProps) {
  const g = useMemo(() => buildGeometry(model), [model])
  const labels = useMemo(() => {
    const wall = (x: number, y: number, z: number) => faceMat(pt(x, y, z), ADVANCE, ON_WALL)
    const floor = (x: number, y: number, z: number) => faceMat(pt(x, y, z), ADVANCE, ON_FLOOR)
    const edge = (x: number) => floor(x, LABEL_Y, BASE_H)
    return {
      houseTitle: wall(-46, HOUSE_FACE, 38),
      houseConfig: wall(-46, HOUSE_FACE, 26),
      hopper: wall(-56, HOP_FACE, HOP_Z + 7),
      deck: wall(-142, DECK_FACE, DECK_TOP - 4),
      axis: floor(-166, LABEL_Y, BASE_H),
      ticks: [
        { at: edge(model.bins[0].x0), text: fmt(model.lo) },
        { at: edge(0), text: fmt(model.lo + model.span / 2) },
        { at: edge(model.bins[NBINS - 1].x1), text: fmt(model.hi) },
      ],
    }
  }, [model, fmt])

  return (
    <IsoFigure
      width={WIDTH}
      height={HEIGHT}
      label="Isometric path mill: sampled paths leave the mill housing, run down a deck and drop into the bin their terminal price claims"
    >
      {/* floor */}
      <path className="iso-halo" d={g.plinth.outline} />
      <Solid paths={g.plinth} tone="lo" crease="faint" />
      <Solid paths={g.base} tone="mid" crease="faint" />
      <Line d={g.rail} tone="faint" />
      <Line d={g.minorTicks} tone="lo" />
      <Line d={g.majorTicks} tone="mid" />

      {/* mill housing, hopper, crank */}
      <Solid paths={g.house} tone="mid" crease="faint" />
      <Solid paths={g.lip} tone="hi" crease="faint" />
      <Solid paths={g.hop} tone="mid" crease="faint" />
      <path className="mcmill-vent" d={g.ventDisc} />
      <Line d={g.vent} tone="hi" />
      <Dots points={g.grain} size={0.95} tone="hi" />
      <Solid paths={g.shaft} tone="lo" crease="faint" />
      <Line d={g.hub} tone="mid" />

      {/* landing deck, then the paths themselves — they lie on top of it */}
      <Solid paths={g.deck} tone="mid" crease="faint" />
      {g.threads.map((d, i) => (
        <Line key={i} d={d} tone="green" />
      ))}

      {/* bin rack: dividers behind the grain they hold */}
      {g.walls.map((w, i) => (
        <Solid key={i} paths={w} tone="lo" crease="faint" />
      ))}
      {g.columns.map((c, i) => (
        <Solid key={i} paths={c} tone="hi" crease="faint" />
      ))}

      <MillLive model={model} />

      {/* engraved text */}
      <FaceText transform={labels.hopper} size={4} tone="mid">
        HOPPER · {model.total} PATHS
      </FaceText>
      <FaceText transform={labels.houseTitle} size={4.5} tone="hi">
        GBM ENGINE
      </FaceText>
      <FaceText transform={labels.houseConfig} size={3.6} tone="mid">
        {config}
      </FaceText>
      <FaceText transform={labels.deck} size={4} tone="hi">
        TERMINAL DISTRIBUTION
      </FaceText>
      <FaceText transform={labels.axis} size={5} tone="mid">
        {metricLabel} →
      </FaceText>
      {labels.ticks.map((t, i) => (
        <FaceText key={i} transform={t.at} size={5} tone={i === 1 ? 'hi' : 'mid'}>
          {t.text}
        </FaceText>
      ))}
    </IsoFigure>
  )
}
