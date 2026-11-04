import { useEffect, useRef } from 'react'
import { iso, type Flat, type Point3 } from '../../iso/iso-kit'
import { useLoop } from '../../iso/live'
import { crankAt } from './geometry'
import type { MillModel } from './model'
import { P } from './view'

/** seconds for one grain to run the length of a thread */
const LOOP = 5
/** seconds per crank revolution */
const TURN = 4
/** crank angle of the still pose */
const REST = 0

/** world point at fraction u along a polyline, projected flat */
function at(pts: Point3[], u: number): Flat {
  const last = pts.length - 1
  const f = Math.min(u, 0.999999) * last
  const i = Math.floor(f)
  const t = f - i
  const a = pts[i]
  const b = pts[Math.min(i + 1, last)]
  return iso([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], P)
}

/** Grain riding every thread, plus the crank that draws the seed. */
export function MillLive({ model }: { model: MillModel }) {
  const balls = useRef<(SVGGElement | null)[]>([])
  const arm = useRef<SVGPathElement>(null)
  const knob = useRef<SVGPathElement>(null)
  const phase = useRef(0)
  const theta = useRef(REST)

  const paint = (p: number, t: number) => {
    const n = model.threads.length
    model.threads.forEach((thread, k) => {
      const [x, y] = at(thread.pts, ((k + 1) / (n + 1) + p) % 1)
      balls.current[k]?.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`)
    })
    const crank = crankAt(t)
    arm.current?.setAttribute('d', crank.arm)
    knob.current?.setAttribute('d', crank.knob)
  }

  // still pose whenever the model changes — also the first paint, before any frame
  useEffect(() => {
    phase.current = 0
    theta.current = REST
    paint(0, REST)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model])

  // shortcut: once calm stops the loop a later model change repaints the still
  // pose but the rAF loop stays stopped — restart it here if that ever matters
  useLoop((dt, calm) => {
    if (calm) {
      paint(0, REST)
      return false
    }
    phase.current = (phase.current + dt / LOOP) % 1
    theta.current += (dt / TURN) * Math.PI * 2
    paint(phase.current, theta.current)
    return true
  }, true)

  const rest = crankAt(REST)

  return (
    <g className="mcmill-live">
      {model.threads.map((_, k) => (
        <g
          key={k}
          data-ball={k}
          ref={(el) => {
            balls.current[k] = el
          }}
        >
          <circle r={3} className="mcmill-ball" />
        </g>
      ))}
      <path ref={arm} className="iso-line" data-tone="mid" d={rest.arm} />
      <path ref={knob} className="iso-line" data-tone="hi" d={rest.knob} />
    </g>
  )
}
