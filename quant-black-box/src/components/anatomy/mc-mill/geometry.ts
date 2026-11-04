import {
  circleRing,
  iso,
  onTop,
  pathOf,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
  type SolidPaths,
} from '../../iso/iso-kit'
import { NBINS, type MillModel } from './model'
import {
  BASE,
  BASE_H,
  BIN_MAX_H,
  COL_D,
  COL_Y,
  CRANK_ARM,
  CRANK_BOX_H,
  CRANK_FACE,
  CRANK_KNOB,
  CRANK_SHAFT,
  CRANK_Z,
  DECK,
  DECK_H,
  DECK_Z,
  HOP,
  HOP_CY,
  HOP_TOP,
  HOP_Z,
  HOP_H,
  HOUSE,
  HOUSE_CY,
  HOUSE_Z,
  HOUSE_H,
  HUB_X,
  LIP,
  LIP_Z,
  LIP_H,
  P,
  PLINTH,
  PLINTH_H,
  RACK,
  RACK_H,
  RACK_Z,
  RAIL_Y,
  TICK_MAJOR,
  TICK_MINOR,
  VENT_R,
  WALL_T,
  pt,
} from './view'

export const slab = (plan: Plan, z: number, h: number, steps = 8, bevel = 0): SolidPaths =>
  slabOf(plan, z, h, P, steps, bevel)

export const ringOn = (cx: number, cy: number, r: number, z: number, steps = 44, closed = true): string =>
  onTop(circleRing(cx, cy, r, steps), z, P, closed)

export const poly = (pts: Point3[], closed = false): string =>
  pathOf(
    pts.map((p) => iso(p, P)),
    closed,
  )

export const seg = (a: Point3, b: Point3): string => poly([a, b])

/** Circle living in the plane spanned by `u` and `v`, centred at `c`. */
export function circleIn(c: Point3, r: number, u: Point3, v: Point3, steps = 40): string {
  const pts: Flat[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const cu = Math.cos(a) * r
    const cv = Math.sin(a) * r
    pts.push(
      iso([c[0] + u[0] * cu + v[0] * cv, c[1] + u[1] * cu + v[1] * cv, c[2] + u[2] * cu + v[2] * cv], P),
    )
  }
  return pathOf(pts, true)
}

const thou = (n: number) => Math.round(n * 1000) / 1000

/** Transform for FaceText on any face: glyphs advance along `u`, stack downward along `v`. */
export function faceMat(o: Point3, u: Point3, v: Point3): string {
  const a = iso(o, P)
  const b = iso([o[0] + u[0], o[1] + u[1], o[2] + u[2]], P)
  const c = iso([o[0] + v[0], o[1] + v[1], o[2] + v[2]], P)
  return `matrix(${thou(b[0] - a[0])} ${thou(b[1] - a[1])} ${thou(c[0] - a[0])} ${thou(c[1] - a[1])} ${thou(a[0])} ${thou(a[1])})`
}

export interface MillGeometry {
  plinth: SolidPaths
  base: SolidPaths
  rail: string
  minorTicks: string
  majorTicks: string
  house: SolidPaths
  lip: SolidPaths
  hop: SolidPaths
  vent: string
  ventDisc: string
  grain: Flat[]
  shaft: SolidPaths
  hub: string
  deck: SolidPaths
  walls: SolidPaths[]
  columns: SolidPaths[]
  threads: string[]
}

/** Every static part of the machine, built from the machine's own layout plus the real data. */
export function buildGeometry(model: MillModel): MillGeometry {
  const base = slab(BASE, 0, BASE_H, 10, 1)
  const edges = model.bins.map((b) => b.x0)
  edges.push(model.bins[NBINS - 1].x1)
  const onApron = (x: number, len: number) => seg(pt(x, RAIL_Y, BASE_H), pt(x, RAIL_Y + len, BASE_H))
  // majors mark the ends and the exact price midpoint; the rest are bin separators
  const majors = [edges[0], 0, edges[NBINS]]
  const interiors = edges.slice(1, NBINS)

  const walls = edges.map((x) =>
    slab({ x: x - WALL_T / 2, y: RACK.y, w: WALL_T, d: RACK.d, r: 1 }, RACK_Z, RACK_H, 4),
  )

  const columns = model.bins
    .filter((b) => b.count > 0)
    .map((b) =>
      slab(
        {
          x: b.x0 + 1.5,
          y: COL_Y,
          w: Math.max(1, b.x1 - b.x0 - 3),
          d: COL_D,
          r: 1,
        },
        RACK_Z,
        (b.count / model.maxCount) * BIN_MAX_H,
        4,
      ),
    )

  const grain: Point3[] = []
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = VENT_R + 5 + (i % 3) * 3
    grain.push([Math.cos(a) * r, HOP_CY + Math.sin(a) * r * 0.62, HOP_TOP])
  }
  const grainFlat = grain.map((p) => iso(p, P))

  return {
    plinth: slab(PLINTH, -PLINTH_H, PLINTH_H, 8, 0),
    base,
    rail: seg(pt(edges[0], RAIL_Y, BASE_H), pt(edges[NBINS], RAIL_Y, BASE_H)),
    minorTicks: interiors.map((x) => onApron(x, TICK_MINOR)).join(''),
    majorTicks: majors.map((x) => onApron(x, TICK_MAJOR)).join(''),
    house: slab(HOUSE, HOUSE_Z, HOUSE_H, 8, 1),
    lip: slab(LIP, LIP_Z, LIP_H, 6, 0.6),
    hop: slab(HOP, HOP_Z, HOP_H, 8, 0.6),
    vent: ringOn(0, HOP_CY, VENT_R, HOP_TOP),
    ventDisc: ringOn(0, HOP_CY, VENT_R - 0.6, HOP_TOP),
    grain: grainFlat,
    shaft: slab(
      { x: CRANK_FACE - 2, y: HOUSE_CY - 4, w: CRANK_SHAFT + 2, d: 8, r: 1.5 },
      CRANK_Z - CRANK_BOX_H / 2,
      CRANK_BOX_H,
      4,
    ),
    hub: circleIn(pt(HUB_X, HOUSE_CY, CRANK_Z), 6, [0, 1, 0], [0, 0, 1]),
    deck: slab(DECK, DECK_Z, DECK_H, 6, 0.6),
    walls,
    columns,
    threads: model.threads.map((t) => poly(t.pts)),
  }
}

/** One crank sweep — recomputed each frame by the animation layer. */
export function crankAt(theta: number): { arm: string; knob: string } {
  const end: Point3 = [
    HUB_X,
    HOUSE_CY + CRANK_ARM * Math.cos(theta),
    CRANK_Z + CRANK_ARM * Math.sin(theta),
  ]
  return {
    arm: seg(pt(HUB_X, HOUSE_CY, CRANK_Z), end),
    knob: circleIn(end, CRANK_KNOB, [0, 1, 0], [0, 0, 1]),
  }
}
