export const money = (x: number, d = 2): string => '$' + x.toFixed(d)

export const pct = (x: number, d = 1): string => (x >= 0 ? '+' : '') + (x * 100).toFixed(d) + '%'

export const signPct = (x: number, d = 2): string => (x >= 0 ? '+' : '') + (x * 100).toFixed(d) + '%'

export const num = (x: number, d = 2): string => x.toFixed(d)
