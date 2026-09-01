import { useCallback, useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ReferenceDot, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Header, LeftPanel, ModelShell, Tier1Nav, Tier2Nav } from '../components/layout'
import { Accordion, Hint, ParamLabel, Seg, Slider, Stat, StatList, useHotkeys } from '../components/ui'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import LiveMarketIngestion from '../components/LiveMarketIngestion'
import RightSidebar from '../components/RightSidebar'
import { BS_FORMULAS } from '../lib/formulas'
import { bs } from '../lib/math'
import { money } from '../lib/format'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { Metric, Opt } from '../store/models'
import { useBs } from '../store/models'

export default function BlackScholesPage() {
  const s = useBs()
  const setView = useApp((st) => st.setView)
  const [info, setInfo] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const recordRun = useWorkspace((st) => st.recordRun)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  useHotkeys({
    b: () => setLeftOpen((v) => !v),
    r: () => setRightOpen((v) => !v),
    m: () => {
      const el = document.getElementById('market-data-input')
      if (el) el.focus()
    },
  })

  const S0 = s.S0
  const K = s.K
  const T = s.T / 100
  const r = s.r / 100
  const sig = s.sig / 100

  const surface = useMemo(() => {
    const N = 50
    const x0 = K * 0.4
    const x1 = K * 1.6
    const y0 = 0.05
    const y1 = 1.6
    const points: SurfacePoint[] = []
    for (let i = 0; i < N; i++) {
      const x = x0 + ((x1 - x0) * i) / (N - 1)
      for (let j = 0; j < N; j++) {
        const t = y0 + ((y1 - y0) * j) / (N - 1)
        const m = bs(x, K, t, r, sig)
        if (!m) continue
        const z = s.metric === 'price' ? (s.opt === 'call' ? m.C : m.P) : s.opt === 'call' ? m.delta : m.deltaP
        points.push([x, t, z])
      }
    }
    return {
      points,
      shape: [N, N] as [number, number],
      xRange: [x0, x1] as [number, number],
      yRange: [y0, y1] as [number, number],
    }
  }, [K, r, sig, s.metric, s.opt])

  const m = useMemo(() => bs(S0, K, T, r, sig), [S0, K, T, r, sig])
  const atm = useMemo(() => bs(S0, S0, 1, r, sig), [S0, r, sig])

  const cross = useMemo(() => {
    const x0 = K * 0.4
    const x1 = K * 1.6
    const arr: { spot: number; value: number }[] = []
    for (let i = 0; i <= 24; i++) {
      const spot = x0 + ((x1 - x0) * i) / 24
      const mm = bs(spot, K, T, r, sig)
      if (!mm) continue
      const value = s.metric === 'price' ? (s.opt === 'call' ? mm.C : mm.P) : s.opt === 'call' ? mm.delta : mm.deltaP
      arr.push({ spot, value })
    }
    return arr
  }, [K, T, r, sig, s.metric, s.opt])

  const mAtSpot = m ? (s.metric === 'price' ? (s.opt === 'call' ? m.C : m.P) : s.opt === 'call' ? m.delta : m.deltaP) : 0
  const atmPrice = atm ? (s.opt === 'call' ? atm.C : atm.P) : 0
  const delta = m ? (s.opt === 'call' ? m.delta : m.deltaP) : 0

  useEffect(() => {
    if (!m) return
    const t0 = performance.now()
    const outputs: Record<string, number> = {
      price: s.opt === 'call' ? m.C : m.P,
      delta,
      gamma: m.gamma,
      vega: m.vega,
      theta: m.theta,
      rho: m.rho,
    }
    recordRun({
      modelId: 'bs',
      scenarioName: 'Live',
      inputs: { S0, K, T, r, sig, opt: s.opt, metric: s.metric },
      outputsSummary: outputs,
      runtimeMs: performance.now() - t0,
    })
  }, [S0, K, T, r, sig, s.opt, s.metric])

  const handleApplyLiveData = useCallback((params: { S0: number; mu: number; sig: number }) => {
    s.set({ S0: params.S0, sig: params.sig })
  }, [s.set])

  const metricsContent = (
    <StatList>
      <Stat k="ATM Price (1Y)" v={money(atmPrice)} tone="price" />
      <Stat k="Spot" v={money(S0)} />
      <Stat k="Strike" v={money(K)} />
      <Stat k="Time" v={T.toFixed(2) + 'y'} />
      <Stat k="Risk-Free" v={s.r.toFixed(1) + '%'} />
      <Stat k="Volatility" v={s.sig.toFixed(1) + '%'} />
      <Stat k="Delta" v={(m ? delta : 0).toFixed(4)} />
      <Stat k="Gamma" v={(m ? m.gamma : 0).toFixed(4)} />
      <Stat k="Vega" v={(m ? m.vega : 0).toFixed(3)} />
      <Stat k="Theta" v={(m ? m.theta : 0).toFixed(3)} />
      <Stat k="Rho" v={(m ? m.rho : 0).toFixed(3)} />
    </StatList>
  )

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title="3D BLACK-SCHOLES DELTA SURFACE"
        badge={s.opt.toUpperCase()}
        badgeTone={s.opt === 'put' ? 'red' : 'green'}
        onInfo={() => setInfo(true)}
        onBack={() => setView('index')}
        onReset={() => setResetToken((t) => t + 1)}
      />
      <ModelShell>
        {leftOpen && (
          <LeftPanel>
            <LiveMarketIngestion onApply={handleApplyLiveData} />

            <Accordion title="PARAMETERS">
              <ParamLabel>Option Type</ParamLabel>
              <Seg
                options={[
                  { value: 'call', label: 'CALL' },
                  { value: 'put', label: 'PUT' },
                ]}
                value={s.opt}
                onChange={(v) => s.set({ opt: v as Opt })}
              />
              <ParamLabel>Surface Metric</ParamLabel>
              <Seg
                options={[
                  { value: 'price', label: 'PRICE' },
                  { value: 'delta', label: 'DELTA' },
                ]}
                value={s.metric}
                onChange={(v) => s.set({ metric: v as Metric })}
              />
              <Slider label="SPOT (S)" min={10} max={300} step={1} value={S0} display={money(S0)} onChange={(S0v) => s.set({ S0: S0v })} />
              <Slider label="STRIKE (K)" min={10} max={300} step={1} value={K} display={money(K)} onChange={(Kv) => s.set({ K: Kv })} />
              <Slider label="TIME (T)" min={1} max={200} step={1} value={s.T} display={T.toFixed(2) + 'y'} onChange={(Tv) => s.set({ T: Tv })} />
              <Slider label="RISK-FREE (R)" min={-5} max={20} step={1} value={s.r} display={s.r.toFixed(1) + '%'} onChange={(rv) => s.set({ r: rv })} />
              <Slider label="VOLATILITY (Σ)" min={1} max={200} step={1} value={s.sig} display={s.sig.toFixed(1) + '%'} onChange={(sv) => s.set({ sig: sv })} />
            </Accordion>

            <Accordion title="DISPLAY">
              <DisplayControls value={s} onChange={s.set} />
            </Accordion>

            <Accordion title="CROSS-SECTION">
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cross} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <XAxis dataKey="spot" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Line type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <ReferenceDot x={S0} y={mAtSpot} r={2.5} fill="#16c784" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Accordion>
          </LeftPanel>
        )}

        <div className="relative min-w-0 flex-1">
          <SurfaceChart
            points={surface.points}
            dataShape={surface.shape}
            xName="SPOT"
            yName="TIME"
            zName={s.metric.toUpperCase()}
            xRange={surface.xRange}
            yRange={surface.yRange}
            scheme={s.scheme}
            wire={s.wire}
            grid={s.grid}
            axes={s.axes}
            rot={s.rot}
            resetToken={resetToken}
          />
          <Hint text="Drag to rotate · Scroll to zoom · Right-click to pan · Resolution: 50² · [B] left · [R] right · [M] market data" />
        </div>

        {rightOpen && (
          <RightSidebar metricsContent={metricsContent} scaleLabel={s.metric === 'delta' ? 'DELTA SCALE' : 'PRICE SCALE'} />
        )}
      </ModelShell>

      <FormulaModal open={info} title="Black-Scholes-Merton (BSM)" formulas={BS_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
