export type Scheme = 'pl' | 'mono' | 'neon'

export interface SchemeDef {
  value: Scheme
  label: string
  swatchClass: string
}

export const SCHEMES: SchemeDef[] = [
  { value: 'pl', label: 'P&L', swatchClass: 'sw-pl' },
  { value: 'mono', label: 'MONO', swatchClass: 'sw-mono' },
  { value: 'neon', label: 'NEON', swatchClass: 'sw-neon' },
]

export const CMAP: Record<Scheme, string[]> = {
  pl: ['#7f1d1d', '#dc2626', '#3a0a0a', '#000000', '#052e16', '#16c784', '#14532d'],
  mono: ['#0a0a0a', '#2a2a2a', '#71717a', '#fafafa'],
  neon: ['#0f4c5c', '#0e7490', '#2dd4bf', '#00ff88'],
}
