import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import 'echarts-gl'
import type { Scheme } from '../lib/colors'
import { CMAP } from '../lib/colors'

export type SurfacePoint = [number, number, number]

export interface SurfaceChartProps {
  points: SurfacePoint[]
  dataShape: [number, number]
  xName: string
  yName: string
  zName: string
  xRange: [number, number]
  yRange: [number, number]
  scheme: Scheme
  wire: boolean
  grid: boolean
  axes: boolean
  rot: boolean
  resetToken: number
  xLabels?: string[]
  mobile?: boolean
}

const AXIS_LABEL = { color: '#555555', fontSize: 8, fontFamily: 'JetBrains Mono' }
const AXIS_NAME = { color: '#666666', fontSize: 10, fontFamily: 'JetBrains Mono' }

function buildOption(props: SurfaceChartProps): Record<string, unknown> {
  const { points, dataShape, xName, yName, zName, xRange, yRange, scheme, wire, grid, axes, xLabels, mobile } = props

  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    if (p[2] < min) min = p[2]
    if (p[2] > max) max = p[2]
  }
  if (!Number.isFinite(min)) {
    min = 0
    max = 1
  }
  if (max - min < 1e-9) max = min + 1

  const axis = (name: string, range: [number, number]): Record<string, unknown> => ({
    name,
    nameTextStyle: mobile ? { ...AXIS_NAME, fontSize: 8 } : AXIS_NAME,
    type: 'value',
    min: range[0],
    max: range[1],
    axisLabel: xLabels
      ? {
          ...(mobile ? { ...AXIS_LABEL, fontSize: 6 } : AXIS_LABEL),
          formatter: (v: number) => xLabels[Math.round(v)] ?? String(v),
        }
      : mobile ? { ...AXIS_LABEL, fontSize: 6 } : AXIS_LABEL,
    axisLine: { show: axes, lineStyle: { color: '#333333' } },
    axisTick: { show: false },
    splitLine: { show: grid, lineStyle: { color: '#222222', width: 1 } },
  })

  return {
    animation: true,
    backgroundColor: 'transparent',
    tooltip: { show: false },
    visualMap: {
      show: false,
      min,
      max,
      dimension: 2,
      seriesIndex: 0,
      inRange: { color: CMAP[scheme] },
    },
    xAxis3D: axis(xName, xRange),
    yAxis3D: axis(yName, yRange),
    zAxis3D: { ...axis(zName, [min, max]), name: zName },
    grid3D: {
      show: true,
      boxWidth: mobile ? 120 : 184,
      boxDepth: mobile ? 100 : 160,
      boxHeight: mobile ? 80 : 136,
      environment: 'transparent',
      axisPointer: { show: false },
      viewControl: {
        alpha: 30,
        beta: 40,
        distance: mobile ? 160 : 220,
        minDistance: 60,
        maxDistance: 700,
        rotateSensitivity: 1,
        zoomSensitivity: 1,
        panSensitivity: 1,
        autoRotate: props.rot,
        animationDurationUpdate: 150,
        animationEasingUpdate: 'cubicOut',
      },
    },
    series: [
      {
        type: 'surface',
        name: zName,
        data: points,
        dataShape,
        shading: 'color',
        wireframe: {
          show: wire,
          lineStyle: { color: '#111111', width: 1 },
        },
      },
    ],
  }
}

export default function SurfaceChart(props: SurfaceChartProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const firstBuild = useRef(true)
  const resetRef = useRef(0)

  const { points, dataShape, scheme, wire, grid, axes, xName, yName, zName, xRange, yRange, xLabels, rot, resetToken } =
    props
  const labelsKey = xLabels ? xLabels.join('\u0000') : ''

  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const chart = echarts.init(el)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
      chartRef.current = null
      firstBuild.current = true
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(buildOption(props) as unknown as echarts.EChartsOption, { notMerge: firstBuild.current })
    firstBuild.current = false
  }, [points, dataShape, scheme, wire, grid, axes, xName, yName, zName, xRange, yRange, labelsKey])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption({ grid3D: { viewControl: { autoRotate: rot } } } as unknown as echarts.EChartsOption)
  }, [rot])

  useEffect(() => {
    if (resetToken === resetRef.current) return
    resetRef.current = resetToken
    const chart = chartRef.current
    if (!chart) return
    chart.setOption({
      grid3D: { viewControl: { alpha: 30, beta: 40, distance: 220, autoRotate: rot } },
    } as unknown as echarts.EChartsOption)
  }, [resetToken])

  return <div ref={divRef} className={`absolute inset-0 ${props.mobile ? 'touch-lock' : ''}`} />
}
