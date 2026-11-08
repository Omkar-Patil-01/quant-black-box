import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'

const AXIS_LABEL = { color: '#555555', fontSize: 8, fontFamily: 'JetBrains Mono' }
const SPLIT = { lineStyle: { color: '#131313' } }

export interface FanSeries {
  name: string
  data: number[]
  color: string
}

function xLabel(step: number, steps: number, T: number) {
  const years = (step / steps) * T
  if (years < 1e-9) return 'Now'
  if (years <= 1) return Math.round(years * 12) + 'M'
  return Math.round(years * 10) / 10 + 'Y'
}

/** Mini percentile-fan chart: real paths at fixed terminal percentiles, in display units. */
export default function FanChart({
  series,
  T,
  yFmt,
  height = 170,
}: {
  series: FanSeries[]
  T: number
  yFmt: (v: number) => string
  height?: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const optionRef = useRef<Record<string, unknown>>({})

  const option = useMemo(() => {
    const steps = (series[0]?.data.length ?? 61) - 1
    const labels = Array.from({ length: steps + 1 }, (_, i) => xLabel(i, steps, T))
    return {
      animation: false,
      grid: { left: 6, right: 10, top: 8, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category' as const,
        boundaryGap: false,
        data: labels,
        axisLabel: AXIS_LABEL,
        axisLine: { lineStyle: { color: '#27272a' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        scale: true,
        axisLabel: { ...AXIS_LABEL, formatter: (v: number) => yFmt(v) },
        splitLine: SPLIT,
      },
      legend: {
        bottom: 0,
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 2,
        textStyle: { ...AXIS_LABEL, fontSize: 8 },
      },
      series: series.map((s) => ({
        name: s.name,
        type: 'line' as const,
        data: s.data,
        showSymbol: false,
        lineStyle: { width: 1.5, color: s.color },
        itemStyle: { color: s.color },
        animation: false,
      })),
    }
  }, [series, T, yFmt])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const boot = () => {
      chartRef.current = echarts.init(el)
      chartRef.current.setOption(optionRef.current, true)
    }
    // defer init while the container is hidden (zero-width mount inside a sheet)
    if (el.clientWidth > 0) boot()
    const ro = new ResizeObserver(() => {
      if (!chartRef.current) {
        if (el.clientWidth > 0) boot()
      } else chartRef.current.resize()
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    optionRef.current = option
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={wrapRef} style={{ height }} />
}
