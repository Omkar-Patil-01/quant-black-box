import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Header, LeftPanel, ModelShell, RightPanel, Tier1Nav, Tier2Nav, FavoritesBar, WorkspacePanel } from '../components/layout'
import { Accordion, Hint, ParamLabel, Seg, Slider, Stat, StatList, Scale } from '../components/ui'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import MarketPanel from '../components/MarketPanel'
import { MC_FORMULAS } from '../lib/formulas'
import { MC_STEPS, metricVal, simulateMc } from '../lib/math'
import { money, pct } from '../lib/format'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { McMetric } from '../store/models'
import { useMc } from '../store/models'
import type { Quote } from '../lib/marketApi'

export default function MonteCarloPage() {
  const s = useMc()
  const setView = useApp((st) => st.setView)
  const [info, setInfo] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const recordRun = useWorkspace((st) => st.recordRun)

  const S0 = s.S0
  const mu = s.mu / 100
  const sig = s.sig / 100
  const T = s.T / 10
  const npaths = s.npaths
  const gam = s.gam / 10

  const sim = useMemo(() => simulateMc({ S0, mu, sig, T, npaths, gam }), [S0, mu, sig, T, npaths, gam])

  const surface = useMemo(() => {
    const points: SurfacePoint[] = []
    for (let p = 0; p < sim.N; p++) {
      for (let t = 0; t <= MC_STEPS; t++) {
        points.push([(t * sim.T) / MC_STEPS, p + 1, metricVal(sim.sorted[p][t], sim.S0, s.metric)])
      }
    }
    return {
      points,
      shape: [sim.N, MC_STEPS + 1] as [number, number],
      xRange: [0, sim.T] as [number, number],
      yRange: [1, sim.N] as [number, number],
    }
  }, [sim, s.metric])

  const stats = useMemo(() => {
    const t = sim.term
    const n = t.length
    const mean = t.reduce((a, b) => a + b, 0) / n
    const sorted = t.slice().sort((a, b) => a - b)
    const med = (sorted[Math.floor((n - 1) / 2)] + sorted[Math.ceil((n - 1) / 2)]) / 2
    const sd = Math.sqrt(t.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n)
    const var5 = sorted[Math.floor(n * 0.05)]
    const max = sorted[n - 1]
    const min = sorted[0]
    const losses = t.filter((v) => v < sim.S0).length / n
    const logr = t.map((v) => Math.log(v / sim.S0))
    const mlr = logr.reduce((a, b) => a + b, 0) / logr.length
    let util: number
    if (Math.abs(gam - 1) < 0.05) util = t.map(Math.log).reduce((a, b) => a + b, 0) / n
    else util = t.map((v) => (Math.pow(v, 1 - gam) - 1) / (1 - gam)).reduce((a, b) => a + b, 0) / n
    const half = (1.96 * sd) / Math.sqrt(n)
    return { mean, med, sd, var5, max, min, losses, mlr, util, half }
  }, [sim, gam])

  const hist = useMemo(() => {
    const bins = 28
    const min = Math.min(...sim.term)
    const max = Math.max(...sim.term)
    const width = max - min || 1
    const counts = new Array<number>(bins).fill(0)
    for (const v of sim.term) {
      const idx = Math.min(bins - 1, Math.floor(((v - min) / width) * bins))
      counts[idx]++
    }
    return counts.map((c, i) => ({ bin: min + width * (i + 0.5), count: c }))
  }, [sim])

  useEffect(() => {
    const t0 = performance.now()
    recordRun({
      modelId: 'mc',
      scenarioName: 'Live',
      inputs: { S0, mu: s.mu, sig: s.sig, T: s.T, r: s.r, npaths, gam: s.gam, metric: s.metric },
      outputsSummary: { mean: stats.mean, sd: stats.sd, var5: stats.var5, losses: stats.losses },
      runtimeMs: performance.now() - t0,
    })
  }, [S0, s.mu, s.sig, s.T, s.r, npaths, s.gam, s.metric])

  const handleLoadQuote = useCallback((q: Quote) => {
    s.set({ S0: Math.round(q.price) })
  }, [s.set])

  const handleLoadVol = useCallback((vol: number) => {
    s.set({ sig: Math.round(vol * 10000) / 100 })
  }, [s.set])

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title="3D MONTE CARLO PATH SIMULATION"
        badge={s.metric === 'price' ? 'PRICE' : 'RETURN'}
        badgeTone="green"
        onInfo={() => setInfo(true)}
        onBack={() => setView('index')}
        onReset={() => setResetToken((t) => t + 1)}
      />
      <ModelShell>
        <FavoritesBar />
        <WorkspacePanel />

        <div className="absolute right-4 top-4 z-[7]">
          <MarketPanel onLoadQuote={handleLoadQuote} onLoadVol={handleLoadVol} />
        </div>

        <SurfaceChart
          points={surface.points}
          dataShape={surface.shape}
          xName="TIME (YRS)"
          yName="PATH"
          zName={s.metric === 'price' ? 'PRICE' : 'RETURN'}
          xRange={surface.xRange}
          yRange={surface.yRange}
          scheme={s.scheme}
          wire={s.wire}
          grid={s.grid}
          axes={s.axes}
          rot={s.rot}
          resetToken={resetToken}
        />

        <LeftPanel>
          <Accordion title="⚙ PARAMETERS">
            <ParamLabel>Surface Metric</ParamLabel>
            <Seg
              options={[
                { value: 'price', label: 'PRICE' },
                { value: 'ret', label: 'RETURN' },
              ]}
              value={s.metric}
              onChange={(v) => s.set({ metric: v as McMetric })}
            />
            <Slider label="START PRICE (S₀)" min={10} max={500} step={1} value={S0} display={money(S0)} onChange={(v) => s.set({ S0: v })} />
            <Slider label="DRIFT (μ)" min={-20} max={60} step={1} value={s.mu} display={s.mu.toFixed(1) + '%'} onChange={(v) => s.set({ mu: v })} />
            <Slider label="VOLATILITY (σ)" min={1} max={100} step={1} value={s.sig} display={s.sig.toFixed(1) + '%'} onChange={(v) => s.set({ sig: v })} />
            <Slider label="HORIZON (T)" min={1} max={100} step={1} value={s.T} display={T.toFixed(2) + 'y'} onChange={(v) => s.set({ T: v })} />
            <Slider label="RISK-FREE (R)" min={-5} max={20} step={1} value={s.r} display={s.r.toFixed(1) + '%'} onChange={(v) => s.set({ r: v })} />
            <Slider label="PATHS (N)" min={100} max={1000} step={25} value={npaths} display={String(npaths)} onChange={(v) => s.set({ npaths: v })} />
            <Slider label="RISK AVERSION (γ)" min={5} max={100} step={1} value={s.gam} display={gam.toFixed(2)} onChange={(v) => s.set({ gam: v })} />
          </Accordion>

          <Accordion title="◎ DISPLAY">
            <DisplayControls value={s} onChange={s.set} />
          </Accordion>

          <Accordion title="◩ TERMINAL DISTRIBUTION">
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
        </LeftPanel>

        <RightPanel>
          <div className="px-3.5 pt-3">
            <StatList>
              <Stat k="Mean Terminal" v={money(stats.mean)} tone="price" />
              <Stat k="Median Terminal" v={money(stats.med)} tone="price" />
              <Stat k="St Dev Terminal" v={money(stats.sd)} />
              <Stat k="5% VaR" v={money(stats.var5)} tone="neg" />
              <Stat k="Max Terminal" v={money(stats.max)} tone="price" />
              <Stat k="Min Terminal" v={money(stats.min)} tone="neg" />
              <Stat k="P(loss)" v={(stats.losses * 100).toFixed(1) + '%'} />
              <Stat k="Mean Log Ret" v={pct(stats.mlr)} tone="price" />
              <Stat k="E[U(W)] CRRA" v={stats.util.toFixed(3)} />
              <Stat k="95% CI" v={'±$' + stats.half.toFixed(2)} />
            </StatList>
          </div>
          <Scale label={s.metric === 'price' ? 'TERMINAL PRICE' : 'TERMINAL RETURN'} />
        </RightPanel>

        <Hint text="Drag to rotate • Scroll to zoom • Right-click to pan • Paths sorted by terminal" />
      </ModelShell>

      <FormulaModal open={info} title="Monte Carlo Simulation" formulas={MC_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
