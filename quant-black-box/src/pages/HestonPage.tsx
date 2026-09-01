import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header, LeftPanel, ModelShell, Tier1Nav, Tier2Nav } from '../components/layout'
import { Accordion, Hint, ParamLabel, Seg, Slider, Stat, StatList, useHotkeys } from '../components/ui'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import LiveMarketIngestion from '../components/LiveMarketIngestion'
import RightSidebar from '../components/RightSidebar'
import { HESTON_FORMULAS } from '../lib/formulas'
import { hestonP1, hestonPrice } from '../lib/math'
import type { HestonParams } from '../lib/math'
import { money } from '../lib/format'
import { useDebounced } from '../lib/hooks'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { Metric, Opt } from '../store/models'
import { useHeston } from '../store/models'

export default function HestonPage() {
  const s = useHeston()
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

  const params: HestonParams = {
    r,
    v0: (s.v0 / 100) * (s.v0 / 100),
    kappa: s.kappa / 10,
    theta: (s.theta / 100) * (s.theta / 100),
    sigv: s.sigv / 100,
    rho: s.rho / 100,
  }

  const surfaceKey = useDebounced({ K, T, r, v0: s.v0, kappa: s.kappa, theta: s.theta, sigv: s.sigv, rho: s.rho, metric: s.metric, opt: s.opt })

  const surface = useMemo(() => {
    const N = 26
    const x0 = surfaceKey.K * 0.4
    const x1 = surfaceKey.K * 1.6
    const y0 = 0.05
    const y1 = 1.6
    const p: HestonParams = {
      r: surfaceKey.r,
      v0: (surfaceKey.v0 / 100) * (surfaceKey.v0 / 100),
      kappa: surfaceKey.kappa / 10,
      theta: (surfaceKey.theta / 100) * (surfaceKey.theta / 100),
      sigv: surfaceKey.sigv / 100,
      rho: surfaceKey.rho / 100,
    }
    const points: SurfacePoint[] = []
    for (let i = 0; i < N; i++) {
      const x = x0 + ((x1 - x0) * i) / (N - 1)
      for (let j = 0; j < N; j++) {
        const t = y0 + ((y1 - y0) * j) / (N - 1)
        let z: number
        if (surfaceKey.metric === 'delta') {
          const d = hestonP1(x, surfaceKey.K, t, p)
          z = surfaceKey.opt === 'call' ? d : d - 1
          z = Math.min(1, Math.max(-1, z))
        } else {
          const mm = hestonPrice(x, surfaceKey.K, t, p)
          z = surfaceKey.opt === 'call' ? mm.C : mm.P
          z = Math.max(0, z)
        }
        if (!Number.isFinite(z)) z = 0
        points.push([x, t, z])
      }
    }
    return {
      points,
      shape: [N, N] as [number, number],
      xRange: [x0, x1] as [number, number],
      yRange: [y0, y1] as [number, number],
    }
  }, [surfaceKey])

  const stats = useMemo(() => {
    const m = hestonPrice(S0, K, T, params)
    const atm = hestonPrice(S0, S0, 1, params)
    const v0 = params.v0
    const kap = params.kappa
    const th = params.theta
    const sv = params.sigv
    const fvol = Math.sqrt(th + (v0 - th) * Math.exp(-kap * T))
    const feller = (2 * kap * th) / (sv * sv)
    const dS = Math.max(S0 * 0.002, 0.05)
    const dv0 = Math.max(v0 * 0.005, 1e-4)
    const dT = 0.01
    const dr = 0.0005
    const gamma = (hestonPrice(S0 + dS, K, T, params).C - 2 * m.C + hestonPrice(S0 - dS, K, T, params).C) / (dS * dS)
    const vega = (2 * Math.sqrt(v0) * (hestonPrice(S0, K, T, { ...params, v0: v0 + dv0 }).C - m.C)) / dv0
    const thetaG = -(hestonPrice(S0, K, T + dT, params).C - hestonPrice(S0, K, T - dT, params).C) / (2 * dT)
    const rhoG = (hestonPrice(S0, K, T, { ...params, r: r + dr }).C - m.C) / dr
    return {
      atm: s.opt === 'call' ? atm.C : atm.P,
      call: m.C,
      put: m.P,
      fvol,
      feller,
      delta: s.opt === 'call' ? m.delta : m.deltaP,
      gamma,
      vega,
      theta: thetaG,
      rho: rhoG,
    }
  }, [S0, K, T, r, params, s.opt])

  useEffect(() => {
    const t0 = performance.now()
    recordRun({
      modelId: 'heston',
      scenarioName: 'Live',
      inputs: { S0, K, T, r, v0: s.v0, kappa: s.kappa, theta: s.theta, sigv: s.sigv, rho: s.rho, opt: s.opt, metric: s.metric },
      outputsSummary: { call: stats.call, put: stats.put, delta: stats.delta, gamma: stats.gamma, vega: stats.vega, theta: stats.theta, rho: stats.rho },
      runtimeMs: performance.now() - t0,
    })
  }, [S0, K, T, r, s.v0, s.kappa, s.theta, s.sigv, s.rho, s.opt, s.metric])

  const handleApplyLiveData = useCallback((params: { S0: number; mu: number; sig: number }) => {
    s.set({ S0: params.S0, v0: params.sig })
  }, [s.set])

  const metricsContent = (
    <StatList>
      <Stat k="ATM Call (1Y)" v={money(stats.atm)} tone="price" />
      <Stat k="Call" v={money(stats.call)} tone="price" />
      <Stat k="Put" v={money(stats.put)} tone="price" />
      <Stat k="Forward Vol √E[vT]" v={(stats.fvol * 100).toFixed(1) + '%'} />
      <Stat k="Feller 2κθ/σv²" v={stats.feller.toFixed(2) + (stats.feller > 1 ? ' ✓' : ' ⚠')} />
      <Stat k="Delta" v={stats.delta.toFixed(4)} />
      <Stat k="Gamma" v={stats.gamma.toFixed(4)} />
      <Stat k="Vega" v={stats.vega.toFixed(3)} />
      <Stat k="Theta" v={stats.theta.toFixed(3)} />
      <Stat k="Rho" v={stats.rho.toFixed(3)} />
    </StatList>
  )

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title="3D HESTON PRICE SURFACE"
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
              <Slider label="SPOT (S)" min={10} max={300} step={1} value={S0} display={money(S0)} onChange={(v) => s.set({ S0: v })} />
              <Slider label="STRIKE (K)" min={10} max={300} step={1} value={K} display={money(K)} onChange={(v) => s.set({ K: v })} />
              <Slider label="TIME (T)" min={1} max={200} step={1} value={s.T} display={T.toFixed(2) + 'y'} onChange={(v) => s.set({ T: v })} />
              <Slider label="RISK-FREE (R)" min={-5} max={20} step={1} value={s.r} display={s.r.toFixed(1) + '%'} onChange={(v) => s.set({ r: v })} />
              <Slider label="INIT VOL (√v₀)" min={1} max={80} step={1} value={s.v0} display={s.v0.toFixed(1) + '%'} onChange={(v) => s.set({ v0: v })} />
              <Slider label="REVERSION (κ)" min={1} max={100} step={1} value={s.kappa} display={params.kappa.toFixed(2)} onChange={(v) => s.set({ kappa: v })} />
              <Slider label="LONG VOL (√θ)" min={1} max={80} step={1} value={s.theta} display={s.theta.toFixed(1) + '%'} onChange={(v) => s.set({ theta: v })} />
              <Slider label="VOL OF VOL (σv)" min={1} max={200} step={1} value={s.sigv} display={s.sigv.toFixed(1) + '%'} onChange={(v) => s.set({ sigv: v })} />
              <Slider label="CORRELATION (ρ)" min={-100} max={100} step={1} value={s.rho} display={params.rho.toFixed(2)} onChange={(v) => s.set({ rho: v })} />
            </Accordion>

            <Accordion title="DISPLAY">
              <DisplayControls value={s} onChange={s.set} />
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
          <Hint text="Drag to rotate · Scroll to zoom · Right-click to pan · Resolution: 26² · [B] left · [R] right · [M] market data" />
        </div>

        {rightOpen && (
          <RightSidebar metricsContent={metricsContent} scaleLabel={s.metric === 'delta' ? 'DELTA SCALE' : 'PRICE SCALE'} />
        )}
      </ModelShell>

      <FormulaModal open={info} title="Heston Stochastic Volatility" formulas={HESTON_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
