import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Maximize2, Play, ZoomIn, ZoomOut } from 'lucide-react'
import { Header, LeftPanel, ModelShell, ParamsReveal, Tier1Nav, Tier2Nav, BottomSheet, BottomMobileDock, MobileCanvasControls } from '../components/layout'
import { Accordion, BarStat, Chip, Field, Hint, IconBtn, ParamLabel, Seg, Select, Slider, Stat, StatList, useHotkeys } from '../components/ui'
import PathChart from '../components/PathChart'
import type { PathChartHandle } from '../components/PathChart'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import LiveMarketIngestion from '../components/LiveMarketIngestion'
import RightSidebar from '../components/RightSidebar'
import { MC_FORMULAS } from '../lib/formulas'
import { MC_STEPS, mcStats, metricVal, simulateMc } from '../lib/math'
import { money, pct } from '../lib/format'
import { useIsMobile } from '../lib/hooks'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { McMetric } from '../store/models'
import { useMc } from '../store/models'

// highlight palette — every value already exists as a theme colour
const HL = { best: '#10b981', second: '#dc2626', third: '#22d3ee', median: '#f59e0b', worst: '#8b5cf6' }

/** Whole dollars with a sign — matches the reference panel's P&L rows. */
const usd = (x: number, signed = false) =>
  (x >= 0 ? (signed ? '+' : '') : '-') +
  '$' +
  Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 0 })

/** Horizon is stored as years × 10 so existing scenarios keep their values. */
const HORIZONS = [
  { value: '5', label: '6 Months' },
  { value: '10', label: '1 Year' },
  { value: '20', label: '2 Years' },
  { value: '30', label: '3 Years' },
  { value: '50', label: '5 Years' },
  { value: '100', label: '10 Years' },
]

export default function MonteCarloPage() {
  const s = useMc()
  const setView = useApp((st) => st.setView)
  const mobilePanel = useApp((st) => st.mobilePanel)
  const setMobilePanel = useApp((st) => st.setMobilePanel)
  const mobile = useIsMobile()
  const [info, setInfo] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [zoomPct, setZoomPct] = useState(100)
  const chartRef = useRef<PathChartHandle>(null)
  const recordRun = useWorkspace((st) => st.recordRun)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  useHotkeys({
    b: () => { if (!mobile) setLeftOpen((v) => !v) },
    r: () => { if (!mobile) setRightOpen((v) => !v) },
    m: () => {
      const el = document.getElementById('market-data-input')
      if (el) el.focus()
    },
  })

  const S0 = s.S0
  const mu = s.mu / 100
  const sig = s.sig / 100
  const T = s.T / 10
  const npaths = mobile ? Math.min(s.npaths, 150) : s.npaths
  const gam = s.gam / 10

  const sim = useMemo(
    () => simulateMc({ S0, mu, sig, T, npaths, gam, seed: s.seed }),
    [S0, mu, sig, T, npaths, gam, s.seed],
  )
  const stats = useMemo(() => mcStats(sim, gam), [sim, gam])

  // investment is a display scaler only — the simulation always runs on price
  const scale = s.investment / S0
  const pnl = useCallback((price: number) => scale * (price - S0), [scale, S0])
  const toView = useCallback(
    (price: number) => metricVal(price, S0, s.metric, s.investment),
    [S0, s.metric, s.investment],
  )

  const viewPaths = useMemo(() => sim.sorted.map((pth) => pth.map(toView)), [sim.sorted, toView])

  const highlights = useMemo(() => {
    const N = sim.N
    return [
      { index: N - 1, color: HL.best },
      { index: N - 2, color: HL.second },
      { index: N - 3, color: HL.third },
      { index: Math.floor(N / 2), color: HL.median },
      { index: 0, color: HL.worst },
    ]
  }, [sim.N])

  const targetPrice = S0 * (1 + s.target / 100)
  const targetView = useMemo(() => toView(targetPrice), [toView, targetPrice])
  const breakevenView = s.metric === 'price' ? S0 : 0

  const yFmt = useMemo(
    () =>
      (v: number) =>
        s.metric === 'price' ? money(v, 0) : s.metric === 'ret' ? pct(v, 0) : usd(v, true),
    [s.metric],
  )

  const surface = useMemo(() => {
    const points: SurfacePoint[] = []
    for (let p = 0; p < sim.N; p++) {
      for (let t = 0; t <= MC_STEPS; t++) {
        points.push([(t * sim.T) / MC_STEPS, p + 1, toView(sim.sorted[p][t])])
      }
    }
    return {
      points,
      shape: [sim.N, MC_STEPS + 1] as [number, number],
      xRange: [0, sim.T] as [number, number],
      yRange: [1, sim.N] as [number, number],
    }
  }, [sim, toView])

  const pProfit = 1 - stats.losses
  const pTarget = useMemo(
    () => sim.term.filter((v) => v >= targetPrice).length / sim.N,
    [sim.term, sim.N, targetPrice],
  )
  const ePortfolio = s.investment + pnl(stats.mean)
  const var5Pnl = pnl(stats.var5)
  const medianPnl = pnl(stats.median)
  const p95Pnl = pnl(stats.p95)
  const sdPnl = scale * stats.sd
  const sr = (mu - s.r / 100) / sig

  const top = useMemo(
    () =>
      [1, 2, 3].map((rank) => {
        const idx = sim.N - rank
        return { rank, id: sim.order[idx] + 1, gain: pnl(sim.term[idx]) }
      }),
    [sim.order, sim.term, sim.N, pnl],
  )

  // 3D mode only — the 2D chart owns the histogram column
  const hist = useMemo(() => {
    const bins = mobile ? 16 : 28
    let min = Infinity
    let max = -Infinity
    for (const v of sim.term) {
      if (v < min) min = v
      if (v > max) max = v
    }
    const width = max - min || 1
    const counts = new Array<number>(bins).fill(0)
    for (const v of sim.term) {
      const idx = Math.min(bins - 1, Math.floor(((v - min) / width) * bins))
      counts[idx]++
    }
    return counts.map((c, i) => ({ bin: min + width * (i + 0.5), count: c }))
  }, [sim, mobile])

  useEffect(() => {
    const t0 = performance.now()
    recordRun({
      modelId: 'mc',
      scenarioName: 'Live',
      inputs: {
        S0,
        mu: s.mu,
        sig: s.sig,
        T: s.T,
        r: s.r,
        npaths,
        gam: s.gam,
        metric: s.metric,
        investment: s.investment,
        target: s.target,
        seed: s.seed,
      },
      outputsSummary: { mean: stats.mean, sd: stats.sd, var5: stats.var5, losses: stats.losses, dd95: stats.dd95 },
      runtimeMs: performance.now() - t0,
    })
  }, [S0, s.mu, s.sig, s.T, s.r, npaths, s.gam, s.metric, s.investment, s.target, s.seed, stats])

  const handleApplyLiveData = useCallback((params: { S0: number; mu: number; sig: number }) => {
    s.set({ S0: params.S0, mu: params.mu, sig: params.sig })
  }, [s.set])

  const runSimulation = useCallback(() => {
    s.set({ seed: Math.floor(Math.random() * 1e9) })
  }, [s.set])

  const topPerformers = (
    <div className="border-t border-line px-3.5 pb-3.5 pt-3">
      <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-label">Top Performers</div>
      {top.map((t) => (
        <div key={t.id} className="flex items-center justify-between border-b border-[#131313] py-[7px] last:border-b-0">
          <span className="flex items-center gap-2 font-mono text-[10px] text-label">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            #{t.id}
          </span>
          <span className="flex items-center gap-1.5">
            {t.rank === 1 && (
              <span className="rounded bg-green px-1.5 py-0.5 font-mono text-[8px] font-semibold text-black">BEST</span>
            )}
            <span className="font-mono text-[11px] font-medium text-green">{usd(t.gain, true)}</span>
          </span>
        </div>
      ))}
    </div>
  )

  const metricsContent = (
    <>
      <StatList mobile={mobile}>
        <BarStat k="P(PROFIT)" value={(pProfit * 100).toFixed(1) + '%'} ratio={pProfit} tone="green" mobile={mobile} />
        <BarStat k={`P(+${s.target}%)`} value={(pTarget * 100).toFixed(1) + '%'} ratio={pTarget} tone="amber" mobile={mobile} />
        <Stat k="E[PORTFOLIO]" v={usd(ePortfolio)} tone="price" mobile={mobile} />
        <Stat k="VaR 5%" v={usd(var5Pnl)} tone="neg" mobile={mobile} />
        <Stat k="Median" v={usd(medianPnl, true)} tone="price" mobile={mobile} />
        <Stat k="95th" v={usd(p95Pnl, true)} tone="price" mobile={mobile} />
        <Stat k="Std Dev" v={usd(sdPnl)} mobile={mobile} />
        <Stat k="DaR 95%" v={pct(stats.dd95)} tone="neg" mobile={mobile} />
        <Stat k="Max DD" v={pct(stats.maxDD)} tone="neg" mobile={mobile} />
        <Stat k="Skew" v={stats.skew.toFixed(2)} mobile={mobile} />
        <Stat k="Kurtosis" v={stats.kurt.toFixed(2)} mobile={mobile} />
        <Stat k="E[U(W)] CRRA" v={stats.util.toFixed(3)} mobile={mobile} />
      </StatList>
      {!mobile && topPerformers}
    </>
  )

  const horizonOptions = useMemo(() => {
    const own = String(s.T)
    return HORIZONS.some((o) => o.value === own)
      ? HORIZONS
      : [{ value: own, label: `${T.toFixed(1)} Years` }, ...HORIZONS]
  }, [s.T, T])

  const paramsContent = (
    <>
      <LiveMarketIngestion onApply={handleApplyLiveData} />

      <Accordion
        title="PARAMETERS"
        summary={
          <>
            <Chip k="Mode" v={s.view === 'surface' ? '3D' : '2D'} />
            <Chip k="View" v={s.metric === 'price' ? 'Price' : s.metric === 'ret' ? 'P&L %' : 'P&L $'} />
            <Chip k="Inv" v={money(s.investment, 0)} />
            <Chip k="Tgt" v={`${s.target}%`} />
            <Chip k="Horizon" v={horizonOptions.find((o) => o.value === String(s.T))?.label ?? `${s.T}`} />
          </>
        }
      >
        <ParamLabel>Chart</ParamLabel>
        <Seg
          options={[
            { value: 'paths', label: '2D PATHS' },
            { value: 'surface', label: '3D SURFACE' },
          ]}
          value={s.view}
          onChange={(v) => s.set({ view: v as 'paths' | 'surface' })}
        />
        <ParamLabel>View Mode</ParamLabel>
        <Seg
          options={[
            { value: 'pl', label: 'P&L $' },
            { value: 'ret', label: 'P&L %' },
            { value: 'price', label: 'PRICE' },
          ]}
          value={s.metric}
          onChange={(v) => s.set({ metric: v as McMetric })}
        />
        <Field label="$ INVESTMENT" value={s.investment} min={0} onChange={(v) => s.set({ investment: v })} />
        <Field label="TARGET RETURN" value={s.target} min={-90} max={900} onChange={(v) => s.set({ target: v })} />
        <Select
          label="TIME HORIZON"
          value={String(s.T)}
          options={horizonOptions}
          onChange={(v) => s.set({ T: Number(v) })}
        />
      </Accordion>

      <Accordion
        title="MODEL ASSUMPTIONS"
        summary={
          <>
            <Chip k="S₀" v={money(S0, 0)} />
            <Chip k="μ" v={`${s.mu.toFixed(1)}%`} />
            <Chip k="σ" v={`${s.sig.toFixed(1)}%`} />
            <Chip k="N" v={String(npaths)} />
            <Chip k="r" v={`${s.r.toFixed(1)}%`} />
            <Chip k="γ" v={gam.toFixed(2)} />
          </>
        }
      >
        <Slider label="ENTRY PRICE (S₀)" min={10} max={500} step={1} value={S0} display={money(S0)} onChange={(v) => s.set({ S0: v })} mobile={mobile} />
        <Slider label="EXPECTED RETURN" min={-20} max={60} step={1} value={s.mu} display={s.mu.toFixed(1) + '%/yr'} onChange={(v) => s.set({ mu: v })} mobile={mobile} />
        <Slider label="VOLATILITY" min={1} max={100} step={1} value={s.sig} display={s.sig.toFixed(1) + '%'} onChange={(v) => s.set({ sig: v })} mobile={mobile} />
        <Slider label="SIMULATIONS" min={100} max={1000} step={25} value={npaths} display={String(npaths)} onChange={(v) => s.set({ npaths: v })} mobile={mobile} />
        <Slider label="RISK-FREE (R)" min={-5} max={20} step={1} value={s.r} display={s.r.toFixed(1) + '%'} onChange={(v) => s.set({ r: v })} mobile={mobile} />
        <Slider label="RISK AVERSION (γ)" min={5} max={100} step={1} value={s.gam} display={gam.toFixed(2)} onChange={(v) => s.set({ gam: v })} mobile={mobile} />
        <button
          type="button"
          onClick={runSimulation}
          className="mt-1 min-h-[36px] w-full cursor-pointer rounded bg-green py-2.5 text-[10px] font-semibold tracking-[0.14em] text-black transition-opacity hover:opacity-90"
        >
          ▶ RUN SIMULATION
        </button>
      </Accordion>

      {s.view === 'surface' && (
        <Accordion title="DISPLAY">
          <DisplayControls value={s} onChange={s.set} />
        </Accordion>
      )}

      {s.view === 'surface' && (
        <Accordion title="TERMINAL DISTRIBUTION">
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="bin" hide />
                <YAxis hide />
                <Bar dataKey="count" fill="#16c784" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Accordion>
      )}
    </>
  )

  const chartCanvas =
    s.view === 'paths' ? (
      <PathChart
        ref={chartRef}
        paths={viewPaths}
        T={sim.T}
        highlights={highlights}
        target={targetView}
        breakeven={breakevenView}
        targetLabel={`+${s.target}%`}
        breakevenLabel="B/E"
        yFmt={yFmt}
        hist={!mobile}
        resetToken={resetToken}
        onZoom={setZoomPct}
      />
    ) : (
      <SurfaceChart
        points={surface.points}
        dataShape={surface.shape}
        xName="TIME (YRS)"
        yName="PATH"
        zName={s.metric === 'price' ? 'PRICE' : s.metric === 'ret' ? 'RETURN' : 'P&L ($)'}
        xRange={surface.xRange}
        yRange={surface.yRange}
        scheme={s.scheme}
        wire={s.wire}
        grid={s.grid}
        axes={s.axes}
        rot={s.rot}
        resetToken={resetToken}
        mobile={mobile}
      />
    )

  const chartHint =
    s.view === 'paths'
      ? `Scroll: Zoom · Drag: Pan · ${zoomPct}%`
      : 'Drag to rotate · Scroll to zoom · Right-click to pan · Paths sorted by terminal · [B] left · [R] right'

  const toolbar = s.view === 'paths' && !mobile ? (
    <div className="flex gap-1.5">
      <IconBtn icon={<ZoomIn size={13} />} title="Zoom in" onClick={() => chartRef.current?.zoomIn()} />
      <IconBtn icon={<ZoomOut size={13} />} title="Zoom out" onClick={() => chartRef.current?.zoomOut()} />
      <IconBtn icon={<Play size={13} />} onClick={runSimulation}>
        Run
      </IconBtn>
      <IconBtn
        icon={<Maximize2 size={13} />}
        title="Fullscreen"
        onClick={() => {
          if (document.fullscreenElement) document.exitFullscreen()
          else document.documentElement.requestFullscreen()
        }}
      />
    </div>
  ) : undefined

  if (mobile) {
    return (
      <div className="flex h-screen flex-col">
        <Header
          title="MONTE CARLO"
          badge={`SR: ${sr.toFixed(2)}`}
          badgeTone="red"
          onInfo={() => setInfo(true)}
          onBack={() => setView('index')}
          onReset={() => setResetToken((t) => t + 1)}
        />

        <div className="relative min-h-0 flex-1">
          {mobilePanel === 'canvas' && (
            <>
              {chartCanvas}
              <MobileCanvasControls
                onReset={() => setResetToken((t) => t + 1)}
                onColorScheme={() => {}}
                onFullscreen={() => {
                  if (document.fullscreenElement) document.exitFullscreen()
                  else document.documentElement.requestFullscreen()
                }}
              />
            </>
          )}
        </div>

        <BottomSheet open={mobilePanel === 'params'} onClose={() => setMobilePanel('canvas')} title="Parameters & Data">
          {paramsContent}
        </BottomSheet>

        <BottomSheet open={mobilePanel === 'metrics'} onClose={() => setMobilePanel('canvas')} title="Outcomes">
          {metricsContent}
        </BottomSheet>

        <BottomMobileDock />
        <FormulaModal open={info} title="Monte Carlo Simulation" formulas={MC_FORMULAS} onClose={() => setInfo(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title="MONTE CARLO"
        badge={`SR: ${sr.toFixed(2)}`}
        badgeTone="red"
        badge2={`P(succ): ${(pProfit * 100).toFixed(0)}%`}
        badge2Tone="green"
        actions={toolbar}
        onInfo={() => setInfo(true)}
        onBack={() => setView('index')}
        onReset={() => setResetToken((t) => t + 1)}
      />
      <ModelShell>
        {leftOpen && (
          <LeftPanel onCollapse={() => setLeftOpen(false)}>
            {paramsContent}
          </LeftPanel>
        )}

        <div className="relative flex min-w-0 flex-1 flex-col">
          {!leftOpen && <ParamsReveal onClick={() => setLeftOpen(true)} />}
          <div className="relative min-h-0 min-w-0 flex-1">
            {chartCanvas}
            <Hint text={chartHint} />
          </div>

          {rightOpen && (
            <RightSidebar
              metricsContent={metricsContent}
              scaleLabel={s.metric === 'price' ? 'TERMINAL PRICE' : 'TERMINAL P&L'}
            />
          )}
        </div>
      </ModelShell>

      <FormulaModal open={info} title="Monte Carlo Simulation" formulas={MC_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
