import { create } from 'zustand'
import type { Scheme } from '../lib/colors'

export type Opt = 'call' | 'put'
export type Metric = 'price' | 'delta'

export interface DisplayState {
  scheme: Scheme
  wire: boolean
  grid: boolean
  axes: boolean
  rot: boolean
}

export type DisplayPartial = Partial<DisplayState>

export interface BsState extends DisplayState {
  opt: Opt
  metric: Metric
  S0: number
  K: number
  T: number
  r: number
  sig: number
  set: (p: Partial<BsState>) => void
}

export const useBs = create<BsState>((set) => ({
  opt: 'call',
  metric: 'price',
  scheme: 'pl',
  wire: true,
  grid: true,
  axes: true,
  rot: false,
  S0: 100,
  K: 100,
  T: 25,
  r: 5,
  sig: 22,
  set: (p) => set(p),
}))

export interface HestonState extends DisplayState {
  opt: Opt
  metric: Metric
  S0: number
  K: number
  T: number
  r: number
  v0: number
  kappa: number
  theta: number
  sigv: number
  rho: number
  set: (p: Partial<HestonState>) => void
}

export const useHeston = create<HestonState>((set) => ({
  opt: 'call',
  metric: 'price',
  scheme: 'pl',
  wire: true,
  grid: true,
  axes: true,
  rot: false,
  S0: 100,
  K: 100,
  T: 100,
  r: 5,
  v0: 20,
  kappa: 20,
  theta: 20,
  sigv: 30,
  rho: -50,
  set: (p) => set(p),
}))

export type BlMetric = 'ret' | 'wgt'
export type BlSrc = 'views' | 'eqm'

export interface BlState extends DisplayState {
  metric: BlMetric
  src: BlSrc
  lam: number
  tau: number
  del: number
  q1: number
  q2: number
  set: (p: Partial<BlState>) => void
}

export const useBl = create<BlState>((set) => ({
  metric: 'ret',
  src: 'views',
  scheme: 'pl',
  wire: true,
  grid: true,
  axes: true,
  rot: false,
  lam: 25,
  tau: 50,
  del: 10,
  q1: 5,
  q2: 8,
  set: (p) => set(p),
}))

export type McMetric = 'price' | 'ret'

export interface McState extends DisplayState {
  metric: McMetric
  S0: number
  mu: number
  sig: number
  T: number
  r: number
  npaths: number
  gam: number
  set: (p: Partial<McState>) => void
}

export const useMc = create<McState>((set) => ({
  metric: 'price',
  scheme: 'pl',
  wire: true,
  grid: true,
  axes: true,
  rot: false,
  S0: 100,
  mu: 10,
  sig: 25,
  T: 30,
  r: 5,
  npaths: 400,
  gam: 30,
  set: (p) => set(p),
}))

export type AptMetric = 'fair' | 'alpha'

export interface AptState extends DisplayState {
  metric: AptMetric
  r: number
  lam: number
  lams: number
  lamv: number
  b3: number
  al: number
  set: (p: Partial<AptState>) => void
}

export const useApt = create<AptState>((set) => ({
  metric: 'fair',
  scheme: 'pl',
  wire: true,
  grid: true,
  axes: true,
  rot: false,
  r: 5,
  lam: 8,
  lams: 3,
  lamv: 5,
  b3: 50,
  al: 0,
  set: (p) => set(p),
}))

export interface KfState extends DisplayState {
  n: number
  m: number
  Q: number
  R: number
  nDays: number
  seed: number
  set: (p: Partial<KfState>) => void
}

export const useKf = create<KfState>((set) => ({
  scheme: 'pl',
  wire: true,
  grid: true,
  axes: true,
  rot: false,
  n: 2,
  m: 1,
  Q: 0.01,
  R: 0.1,
  nDays: 20,
  seed: 42,
  set: (p) => set(p),
}))
