import { useCallback, useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ReferenceDot, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Header, LeftPanel, ModelShell, ParamsReveal, Tier1Nav, Tier2Nav, BottomSheet, BottomMobileDock, MobileCanvasControls } from '../components/layout'
import { Accordion, Chip, Hint, OutputCard, ParamLabel, Seg, Slider, TermGroup, TermRow, useHotkeys } from '../components/ui'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import LiveMarketIngestion from '../components/LiveMarketIngestion'
import RightSidebar from '../components/RightSidebar'
import { BS_FORMULAS } from '../lib/formulas'
import { bs } from '../lib/math'
import { money, pct } from '../lib/format'
import { InlineMath } from 'react-katex'
import { useIsMobile } from '../lib/hooks'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { Metric, Opt } from '../store/models'
import { useBs } from '../store/models'

export default function BlackScholesPage() {
  const s = useBs()
  const setView = useApp((st) => st.setView)
  const mobilePanel = useApp((st) => st.mobilePanel)
  const setMobilePanel = useApp((st) => st.setMobilePanel)
  const mobile = useIsMobile()
  const [info, setInfo] = useState(false)
  const [resetToken, setResetToken] = useState(0)
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
  const K = s.K
  const T = s.T / 100
  const r = s.r / 100
  const sig = s.sig / 100
  const gridN = mobile ? 26 : 50

  const surface = useMemo(() => {
    const N = gridN
    const x0 = K * 0.4
    const x1 = K * 1.6
    // Keep the canonical window but guarantee it contains T (the slider spans 0.01-2.00y).
    const y0 = T < 0.05 ? T / 20 : 0.05
    const y1 = Math.max(1.6, T)
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
  }, [T, K, r, sig, s.metric, s.opt, gridN])

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

  // output-panel detail: decomposition of the selected price + a real model-integrity check
  const price = m ? (s.opt === 'call' ? m.C : m.P) : 0
  const intrinsic = s.opt === 'call' ? Math.max(S0 - K, 0) : Math.max(K - S0, 0)
  const timeVal = price - intrinsic
  const mny = s.opt === 'call' ? (S0 - K) / K : (K - S0) / K
  const parityGap = m ? m.C - m.P - (S0 - K * Math.exp(-r * T)) : 0
  // moneyness profile of the selected option: ≥ +5% ITM, ≥ −5% ATM, else OTM
  const profile = mny >= 0.05 ? 'ITM' : mny >= -0.05 ? 'ATM' : 'OTM'
  const profileCls =
    profile === 'ITM'
      ? 'border-green/40 bg-green/10 text-green'
      : profile === 'ATM'
        ? 'border-accent-mc/40 bg-accent-mc/10 text-accent-mc'
        : 'border-red/40 bg-red/10 text-red'

  const metricsContent = (
    <div className="space-y-2">
      {/* model header: the pricing formula + the run's fixed parameters */}
      <div className="border border-border bg-[#09090b] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="text-[12px] leading-none text-white">
            <InlineMath math={String.raw`C = S_0 N(d_1) - K e^{-rT} N(d_2)`} />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-label">
            BSM · S₀ {money(S0, 0)} · K {money(K, 0)} · T {T.toFixed(2)} YR · r {s.r.toFixed(1)}% · σ{' '}
            {s.sig.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <OutputCard title="Run Config">
          <TermRow k="Spot S" v={money(S0)} />
          <TermRow k="Strike K" v={money(K)} />
          <TermRow k="Type" v={s.opt === 'put' ? 'Put' : 'Call'} />
          <TermRow k="Horizon" v={`${T.toFixed(2)} yr`} />
          <TermRow k="Risk-free r" v={`${s.r.toFixed(1)}%`} />
          <TermRow k="Volatility σ" v={`${s.sig.toFixed(1)}%`} />
        </OutputCard>

        <div className="space-y-2">
          <OutputCard title={`${s.opt === 'call' ? 'Call' : 'Put'} Price — Decomposition`}>
            <div className="py-1 text-center">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-label">
                {s.opt === 'call' ? 'Call' : 'Put'} (S, K, T)
              </div>
              <div className="mt-0.5 font-mono text-[26px] font-bold tabular-nums text-green">{money(price)}</div>
              <div className="mt-1.5 flex justify-center gap-8">
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-label">Intrinsic</div>
                  <div className="font-mono text-[14px] font-semibold tabular-nums text-white">
                    {money(intrinsic)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-label">Time value</div>
                  <div className="font-mono text-[14px] font-semibold tabular-nums text-green">
                    {money(timeVal)}
                  </div>
                </div>
              </div>
            </div>
          </OutputCard>

          <OutputCard title="Option Diagnostics">
            <TermRow k="Put-call parity gap" v={money(parityGap)} tone={Math.abs(parityGap) < 0.005 ? 'price' : 'neg'} />
            <TermRow k="ATM price (1Y)" v={money(atmPrice)} tone="price" />
            <TermRow k="Moneyness (S−K)/K" v={pct(mny, 1)} tone={mny >= 0 ? 'price' : 'neg'} />
            <TermRow k="d₁" v={(m ? m.d1 : 0).toFixed(4)} />
            <TermRow k="d₂" v={(m ? m.d2 : 0).toFixed(4)} />
          </OutputCard>

          <div
            className={`border px-3 py-2 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.16em] ${profileCls}`}
          >
            Moneyness profile: {profile}
          </div>
        </div>

        <OutputCard title="Pricing">
          <TermRow k="ATM Price (1Y)" v={money(atmPrice)} tone="price" />
          <TermRow k="Call" v={money(m ? m.C : 0)} tone="price" />
          <TermRow k="Put" v={money(m ? m.P : 0)} tone="price" />
        </OutputCard>
      </div>

      <TermGroup title="Greeks">
        <TermRow k="Delta" v={(m ? delta : 0).toFixed(4)} />
        <TermRow k="Gamma" v={(m ? m.gamma : 0).toFixed(4)} />
        <TermRow k="Vega" v={(m ? m.vega : 0).toFixed(3)} />
        <TermRow k="Theta" v={(m ? m.theta : 0).toFixed(3)} />
        <TermRow k="Rho" v={(m ? m.rho : 0).toFixed(3)} />
      </TermGroup>
    </div>
  )

  const paramsContent = (
    <>
      <LiveMarketIngestion onApply={handleApplyLiveData} />

      <Accordion
        title="PARAMETERS"
        summary={
          <>
            <Chip k="Type" v={s.opt === 'put' ? 'Put' : 'Call'} />
            <Chip k="Metric" v={s.metric === 'delta' ? 'Delta' : 'Price'} />
            <Chip k="S" v={money(S0, 0)} />
            <Chip k="K" v={money(K, 0)} />
            <Chip k="T" v={`${T.toFixed(2)}y`} />
            <Chip k="σ" v={`${s.sig.toFixed(1)}%`} />
          </>
        }
      >
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
        <Slider label="SPOT (S)" min={10} max={300} step={1} value={S0} display={money(S0)} onChange={(S0v) => s.set({ S0: S0v })} mobile={mobile} />
        <Slider label="STRIKE (K)" min={10} max={300} step={1} value={K} display={money(K)} onChange={(Kv) => s.set({ K: Kv })} mobile={mobile} />
        <Slider label="TIME (T)" min={1} max={200} step={1} value={s.T} display={T.toFixed(2) + 'y'} onChange={(Tv) => s.set({ T: Tv })} mobile={mobile} />
        <Slider label="RISK-FREE (R)" min={-5} max={20} step={1} value={s.r} display={s.r.toFixed(1) + '%'} onChange={(rv) => s.set({ r: rv })} mobile={mobile} />
        <Slider label="VOLATILITY (Σ)" min={1} max={200} step={1} value={s.sig} display={s.sig.toFixed(1) + '%'} onChange={(sv) => s.set({ sig: sv })} mobile={mobile} />
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
    </>
  )

  if (mobile) {
    return (
      <div className="flex h-screen flex-col">
        <Header
          title="3D BLACK-SCHOLES DELTA SURFACE"
          badge={s.opt.toUpperCase()}
          badgeTone={s.opt === 'put' ? 'red' : 'green'}
          onInfo={() => setInfo(true)}
          onBack={() => setView('index')}
          onReset={() => setResetToken((t) => t + 1)}
        />

        <div className="relative min-h-0 flex-1">
          {mobilePanel === 'canvas' && (
            <>
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
                mobile
              />
              <MobileCanvasControls
                onReset={() => setResetToken((t) => t + 1)}
                onColorScheme={() => {}}
                onFullscreen={() => {
                  const el = document.documentElement
                  if (document.fullscreenElement) document.exitFullscreen()
                  else el.requestFullscreen()
                }}
              />
            </>
          )}
        </div>

        <BottomSheet open={mobilePanel === 'params'} onClose={() => setMobilePanel('canvas')} title="Parameters & Data">
          {paramsContent}
        </BottomSheet>

        <BottomSheet open={mobilePanel === 'metrics'} onClose={() => setMobilePanel('canvas')} title="Metrics & Results">
          {metricsContent}
          <div className="mt-2">
            {s.metric === 'delta' ? 'DELTA SCALE' : 'PRICE SCALE'}
            <div className="scale-bar mt-1.5 h-2 rounded" />
          </div>
        </BottomSheet>

        <BottomMobileDock />
        <FormulaModal open={info} title="Black-Scholes-Merton (BSM)" formulas={BS_FORMULAS} onClose={() => setInfo(false)} />
      </div>
    )
  }

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
          <LeftPanel onCollapse={() => setLeftOpen(false)}>
            {paramsContent}
          </LeftPanel>
        )}

        <div className="relative flex min-w-0 flex-1 flex-col">
          {!leftOpen && <ParamsReveal onClick={() => setLeftOpen(true)} />}
          <div className="relative min-h-0 min-w-0 flex-1">
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
        </div>
      </ModelShell>

      <FormulaModal open={info} title="Black-Scholes-Merton (BSM)" formulas={BS_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
