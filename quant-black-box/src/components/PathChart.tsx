import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import * as echarts from 'echarts'

const AXIS_LABEL = { color: '#555555', fontSize: 8, fontFamily: 'JetBrains Mono' }
const SPLIT = { lineStyle: { color: '#131313' } }
const BAND_COLOR = '#22d3ee'
const HIST_COLOR = '#10b981'

/** shortcut: draws at most MAX_BULK faint paths, stride-sampled. Stats, the histogram and
    the highlighted paths always use every simulated path — raise this only if draw cost bites. */
const MAX_BULK = 400

export interface PathHighlight {
  index: number
  color: string
  label?: string
}

export interface PathChartProps {
  /** y values per step, already in display units, ordered ascending by terminal value */
  paths: number[][]
  /** horizon in years — drives the x tick labels (Now, 2M, 4M … 12M) */
  T: number
  highlights: PathHighlight[]
  /** horizontal markers, in display units */
  target?: number
  breakeven?: number
  targetLabel?: string
  breakevenLabel?: string
  yFmt: (v: number) => string
  /** draw the terminal histogram column sharing the chart's y domain */
  hist: boolean
  resetToken: number
  onZoom?: (pct: number) => void
}

export interface PathChartHandle {
  zoomIn: () => void
  zoomOut: () => void
}

const quant = (asc: number[], p: number) => asc[Math.min(asc.length - 1, Math.floor(asc.length * p))]

function xLabel(step: number, steps: number, T: number) {
  const years = (step / steps) * T
  if (years < 1e-9) return 'Now'
  if (years <= 1) return Math.round(years * 12) + 'M'
  return (Math.round(years * 10) / 10) + 'Y'
}

const PathChart = forwardRef<PathChartHandle, PathChartProps>(function PathChart(props, ref) {
  const { paths, T, highlights, target, breakeven, targetLabel, breakevenLabel, yFmt, hist, resetToken, onZoom } =
    props

  const wrapRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const zoomRef = useRef({ start: 0, end: 100 })
  const onZoomRef = useRef(onZoom)
  onZoomRef.current = onZoom

  const steps = paths[0]?.length ? paths[0].length - 1 : 60

  const yDomain = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    for (const p of paths) {
      for (const v of p) {
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0
      hi = 1
    }
    if (target != null) {
      lo = Math.min(lo, target)
      hi = Math.max(hi, target)
    }
    if (breakeven != null) {
      lo = Math.min(lo, breakeven)
      hi = Math.max(hi, breakeven)
    }
    const pad = (hi - lo) * 0.05 || 1
    return [lo - pad, hi + pad] as [number, number]
  }, [paths, target, breakeven])

  // p5–p95 envelope across paths, one pair per step
  const band = useMemo(() => {
    const n = paths.length
    if (n < 20) return null
    const lo: number[] = []
    const hi: number[] = []
    for (let t = 0; t <= steps; t++) {
      const col = paths.map((p) => p[t]).sort((a, b) => a - b)
      lo.push(quant(col, 0.05))
      hi.push(quant(col, 0.95))
    }
    return { lo, stacked: hi.map((v, i) => v - lo[i]) }
  }, [paths, steps])

  const bins = useMemo(() => {
    if (!hist || paths.length < 2) return []
    const terms = paths.map((p) => p[p.length - 1])
    let lo = Infinity
    let hi = -Infinity
    for (const v of terms) {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    const K = 28
    const W = (hi - lo) / K || 1
    const counts = new Array<number>(K).fill(0)
    for (const v of terms) counts[Math.min(K - 1, Math.floor((v - lo) / W))]++
    return counts.map((c, i) => ({ lo: lo + i * W, hi: lo + (i + 1) * W, count: c, share: c / terms.length }))
  }, [paths, hist])

  const option = useMemo<echarts.EChartsOption>(() => {
    const pairs = paths.map((ys) => ys.map((y, t) => [t, y]))
    const markLine = {
      silent: true,
      symbol: 'none',
      data: [
        ...(target != null
          ? [
              {
                yAxis: target,
                label: {
                  formatter: targetLabel ?? '',
                  position: 'insideEndTop' as const,
                  color: '#10b981',
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                },
                lineStyle: { color: '#10b981', type: 'dashed' as const, width: 1 },
              },
            ]
          : []),
        ...(breakeven != null
          ? [
              {
                yAxis: breakeven,
                label: {
                  formatter: breakevenLabel ?? '',
                  position: 'insideEndBottom' as const,
                  color: '#a1a1aa',
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                },
                lineStyle: { color: '#888888', type: 'dashed' as const, width: 1 },
              },
            ]
          : []),
      ],
    }

    const bulk: echarts.SeriesOption[] = []
    const stride = Math.max(1, Math.ceil(paths.length / MAX_BULK))
    for (let i = 0; i < paths.length; i += stride) {
      bulk.push({
        type: 'line',
        data: pairs[i],
        symbol: 'none',
        silent: true,
        animation: false,
        z: 2,
        lineStyle: { color: '#6b7cff', width: 1, opacity: 0.16 },
      })
    }
    if (bulk.length > 0) bulk[0] = { ...bulk[0], markLine } as echarts.SeriesOption

    const marked: echarts.SeriesOption[] = highlights
      .filter((h) => h.index >= 0 && h.index < pairs.length)
      .map((h) => ({
        type: 'line',
        data: pairs[h.index],
        symbol: 'none',
        animation: false,
        z: 3,
        lineStyle: { color: h.color, width: 1.8 },
      }))

    const series: echarts.SeriesOption[] = [
      ...(band
        ? ([
            {
              type: 'line',
              name: 'bandLo',
              data: band.lo,
              stack: 'band',
              symbol: 'none',
              silent: true,
              animation: false,
              z: 1,
              lineStyle: { opacity: 0 },
              areaStyle: { opacity: 0 },
            },
            {
              type: 'line',
              name: 'band',
              data: band.stacked,
              stack: 'band',
              symbol: 'none',
              silent: true,
              animation: false,
              z: 1,
              lineStyle: { opacity: 0 },
              areaStyle: { color: BAND_COLOR, opacity: 0.1 },
            },
          ] as echarts.SeriesOption[])
        : []),
      ...bulk,
      ...marked,
      ...(hist && bins.length > 0
        ? [
            {
              type: 'custom',
              xAxisIndex: 1,
              yAxisIndex: 1,
              encode: { x: 2, y: 0 },
              silent: true,
              animation: false,
              z: 2,
              data: bins.map((b) => [b.lo, b.hi, b.count]),
              renderItem: (_params: unknown, api: echarts.CustomSeriesRenderItemAPI) => {
                const lo = api.value(0) as number
                const c = api.value(2) as number
                if (c <= 0) return undefined
                const hi = api.value(1) as number
                const p0 = api.coord([0, lo])
                const p1 = api.coord([c, hi])
                const x = p0[0]
                const w = Math.max(p1[0] - p0[0], 0)
                const y = p1[1]
                const h = Math.max(p0[1] - p1[1], 0)
                const share = Math.round(((c / Math.max(paths.length, 1)) * 100) as number)
                return {
                  type: 'group',
                  children: [
                    { type: 'rect', shape: { x, y, width: w, height: h }, style: { fill: HIST_COLOR, opacity: 0.85 } },
                    {
                      type: 'text',
                      style: {
                        x: x + w + 4,
                        y: y + h / 2,
                        text: share + '%',
                        fill: '#a1a1aa',
                        font: '8px "JetBrains Mono", monospace',
                        textAlign: 'left',
                        textVerticalAlign: 'middle',
                      },
                    },
                  ],
                }
              },
            } as unknown as echarts.SeriesOption,
          ]
        : []),
    ]

    return {
      animation: false,
      grid: [
        { left: 52, right: hist ? '21%' : 24, top: 16, bottom: 34 },
        ...(hist ? [{ left: '80%', right: '2%', top: 16, bottom: 34 }] : []),
      ],
      xAxis: [
        {
          type: 'value',
          min: 0,
          max: steps,
          interval: steps / 6,
          axisLine: { lineStyle: { color: '#27272a' } },
          axisTick: { show: false },
          axisLabel: { ...AXIS_LABEL, formatter: (v: number) => xLabel(v, steps, T) },
          splitLine: { show: false },
        },
        ...(hist
          ? [
              {
                type: 'value' as const,
                gridIndex: 1,
                min: 0,
                axisLabel: { show: false },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
              },
            ]
          : []),
      ],
      yAxis: [
        {
          type: 'value',
          min: yDomain[0],
          max: yDomain[1],
          axisLabel: { ...AXIS_LABEL, formatter: (v: number) => yFmt(v) },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: SPLIT,
        },
        ...(hist
          ? [
              {
                type: 'value' as const,
                gridIndex: 1,
                min: yDomain[0],
                max: yDomain[1],
                axisLabel: { show: false },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
              },
            ]
          : []),
      ],
      series,
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseDrag: true,
          moveOnMouseMove: false,
        },
      ],
    }
  }, [paths, steps, T, yDomain, band, bins, highlights, target, breakeven, targetLabel, breakevenLabel, yFmt, hist])

  const zoomBy = useCallback((factor: number) => {
    const { start, end } = zoomRef.current
    const span = (end - start) * factor
    const centre = (start + end) / 2
    let ns = centre - span / 2
    let ne = centre + span / 2
    if (ns < 0) {
      ne -= ns
      ns = 0
    }
    if (ne > 100) {
      ns -= ne - 100
      ne = 100
    }
    ns = Math.max(0, ns)
    ne = Math.min(100, ne)
    if (ne - ns < 3) return
    chartRef.current?.dispatchAction({ type: 'dataZoom', start: ns, end: ne })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomBy(0.7),
      zoomOut: () => zoomBy(1 / 0.7),
    }),
    [zoomBy],
  )

  // init once
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const chart = echarts.init(el)
    chartRef.current = chart
    chart.on('datazoom', () => {
      const dz = (chart.getOption().dataZoom as { start?: number; end?: number }[])[0]
      if (!dz) return
      const start = dz.start ?? 0
      const end = dz.end ?? 100
      zoomRef.current = { start, end }
      onZoomRef.current?.(Math.round(end - start))
    })
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // apply option, then restore any zoom the user had dialled in
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(option, true)
    const { start, end } = zoomRef.current
    if (start > 0 || end < 100) chart.dispatchAction({ type: 'dataZoom', start, end })
  }, [option])

  useEffect(() => {
    zoomRef.current = { start: 0, end: 100 }
    chartRef.current?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
  }, [resetToken])

  return <div ref={wrapRef} className="absolute inset-0" />
})

export default PathChart
