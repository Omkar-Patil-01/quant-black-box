import { fitProjection, type Plan, type Point3, type Projection } from '../../iso/iso-kit'

/* World axes of the mill:
   x = terminal price (the bin rack runs along it)
   y = time (back: hopper → front: bins)
   z = height — the grain falls. */

export const WIDTH = 520
export const HEIGHT = 420
const PAD = 30

/** Base plate everything stands on, over a wider plinth so it reads off the floor. */
export const BASE: Plan = { x: -168, y: -92, w: 336, d: 178, r: 12 }
export const BASE_H = 10
export const PLINTH: Plan = { x: BASE.x - 9, y: BASE.y - 9, w: BASE.w + 18, d: BASE.d + 18, r: 15 }
export const PLINTH_H = 7

/** Mill housing — the drum that draws every shock lives inside. */
export const HOUSE: Plan = { x: -52, y: -86, w: 104, d: 50, r: 6 }
export const HOUSE_Z = BASE_H
export const HOUSE_H = 112
export const HOUSE_TOP = HOUSE_Z + HOUSE_H
export const HOUSE_CY = HOUSE.y + HOUSE.d / 2
export const HOUSE_FACE = HOUSE.y + HOUSE.d

/** Mouth lip the threads leave through. */
export const LIP: Plan = { x: -40, y: -44, w: 80, d: 14, r: 2 }
export const LIP_Z = 94
export const LIP_H = 22
export const EXIT_Y = LIP.y + LIP.d
export const EXIT_Z = LIP_Z + LIP_H / 2

/** Hopper bolted on top of the housing. */
export const HOP: Plan = { x: -64, y: -84, w: 128, d: 46, r: 4 }
export const HOP_Z = HOUSE_TOP
export const HOP_H = 15
export const HOP_TOP = HOP_Z + HOP_H
export const HOP_FACE = HOP.y + HOP.d
export const HOP_CY = HOP.y + HOP.d / 2
export const VENT_R = 24
export const VENT_IN = 18

/** Side crank — one turn per draw of the seed. */
export const CRANK_FACE = HOUSE.x + HOUSE.w
export const CRANK_Z = 64
export const CRANK_SHAFT = 16
export const CRANK_ARM = 22
export const CRANK_KNOB = 5
export const CRANK_BOX_H = 8
export const HUB_X = CRANK_FACE + CRANK_SHAFT

/** Landing deck the threads run down onto. */
export const DECK: Plan = { x: -150, y: 28, w: 300, d: 14, r: 3 }
export const DECK_Z = 74
export const DECK_H = 6
export const DECK_TOP = DECK_Z + DECK_H
export const DECK_FACE = DECK.y + DECK.d
export const LAND_Y = DECK.y + DECK.d / 2
export const LAND_Z = DECK_TOP + 2

/** Bin rack: divider walls + grain columns. */
export const RACK: Plan = { x: -150, y: 44, w: 300, d: 30, r: 3 }
export const RACK_Z = BASE_H
export const RACK_H = 62
export const WALL_T = 2
export const COL_Y = 50
export const COL_D = 20
export const BIN_MAX_H = 56
export const COL_CENTER_Y = COL_Y + COL_D / 2

/** Price axis engraved on the front apron of the base. */
export const RAIL_Y = 76
export const TICK_MINOR = 2
export const TICK_MAJOR = 4.5
export const LABEL_Y = 85.5

export const pt = (x: number, y: number, z: number): Point3 => [x, y, z]

export function bounds(): Point3[] {
  const { x, y, w, d } = PLINTH
  const reach = HUB_X + CRANK_ARM + CRANK_KNOB
  return [
    [x, y, -PLINTH_H],
    [x + w, y, -PLINTH_H],
    [x, y + d, -PLINTH_H],
    [x + w, y + d, -PLINTH_H],
    [BASE.x, BASE.y, BASE_H],
    [BASE.x + BASE.w, BASE.y + BASE.d, BASE_H],
    [HOP.x, HOP.y, HOP_TOP],
    [HOP.x + HOP.w, HOP.y, HOP_TOP],
    [HOP.x, HOP.y + HOP.d, HOP_TOP],
    [HOP.x + HOP.w, HOP.y + HOP.d, HOP_TOP],
    [reach, HOUSE_CY - CRANK_ARM - CRANK_KNOB, CRANK_Z - CRANK_ARM - CRANK_KNOB],
    [reach, HOUSE_CY + CRANK_ARM + CRANK_KNOB, CRANK_Z + CRANK_ARM + CRANK_KNOB],
    [RACK.x, RACK.y + RACK.d, RACK_Z + RACK_H],
    [RACK.x + RACK.w, RACK.y + RACK.d, RACK_Z + RACK_H],
    [DECK.x, DECK.y, DECK_TOP],
    [DECK.x + DECK.w, DECK.y + DECK.d, DECK_TOP],
  ]
}

/** Fixed for every parameter set — machine bounds never depend on the data. */
export const P: Projection = fitProjection(bounds(), WIDTH, HEIGHT, { pad: PAD })
