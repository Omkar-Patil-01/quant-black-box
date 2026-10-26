import { describe, expect, it } from 'vitest'
import { mapYahooCandles } from './market'

// Shape Yahoo actually returns: parallel arrays, nulls for closed bars.
const payload = {
  chart: {
    result: [
      {
        timestamp: [1792416600, 1792503000, 1792589400],
        indicators: {
          quote: [
            {
              open: [340.78, null, 339.36],
              high: [346.0, null, 345.25],
              low: [340.12, null, 338.83],
              close: [342.94, null, 343.99],
              volume: [34573200, null, 35614100],
            },
          ],
        },
      },
    ],
    error: null,
  },
}

describe('Yahoo candle mapping', () => {
  it('drops bars whose close is null and keeps the rest in order', () => {
    const rows = mapYahooCandles(payload)
    expect(rows).toHaveLength(2)
    expect(rows[0]!.close).toBe(342.94)
    expect(rows[1]!.close).toBe(343.99)
    expect(rows[0]!.timestamp < rows[1]!.timestamp).toBe(true)
  })

  it('backfills missing OHLC from the close rather than reporting zeros', () => {
    const sparse = {
      chart: {
        result: [
          {
            timestamp: [1792416600],
            indicators: { quote: [{ close: [10], volume: [5] }] },
          },
        ],
        error: null,
      },
    }
    const [row] = mapYahooCandles(sparse)
    expect(row).toMatchObject({ open: 10, high: 10, low: 10, close: 10, volume: 5 })
  })

  it('returns an empty list when Yahoo reports no result', () => {
    expect(mapYahooCandles({ chart: { result: [], error: null } })).toEqual([])
    expect(mapYahooCandles({ chart: {} })).toEqual([])
  })

  it('throws the upstream description when Yahoo returns an error', () => {
    expect(() =>
      mapYahooCandles({ chart: { result: [], error: { description: 'No data found, symbol may be delisted' } } }),
    ).toThrow(/No data found/)
  })
})
