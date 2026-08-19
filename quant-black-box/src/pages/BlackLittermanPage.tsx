import { useEffect, useMemo, useState } from 'react'
import { Header, LeftPanel, ModelShell, RightPanel, Tier1Nav, Tier2Nav, FavoritesBar, WorkspacePanel } from '../components/layout'
import { Accordion, Hint, ParamLabel, Seg, Slider, Stat, StatList, Scale } from '../components/ui'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import { BL_FORMULAS } from '../lib/formulas'
import { BL_NAMES, BL_WMKT, blSolve } from '../lib/math'
import { signPct } from '../lib/format'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { BlMetric, BlSrc } from '../store/models'
import { useBl } from '../store/models'

export default function BlackLittermanPage() {
  const s = useBl()
  const setView = useApp((st) => st.setView)
  const [info, setInfo] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const recordRun = useWorkspace((st) => st.recordRun)

  const lam = s.lam / 10
  const tau = s.tau / 1000
  const del = s.del / 100
  const q1 = s.q1 / 100
  const q2 = s.q2 / 100

  const surface = useMemo(() => {
    const NY = 25
    const t0 = tau
    const points: SurfacePoint[] = []
    for (let j = 0; j < NY; j++) {
      const t = t0 * (0.2 + (3.8 * j) / (NY - 1))
      const r = blSolve(t, { lam, del, q1, q2 })
      for (let i = 0; i < BL_NAMES.length; i++) {
        let z: number
        if (s.src === 'eqm') z = s.metric === 'ret' ? r.Pi[i] : BL_WMKT[i]
        else z = s.metric === 'ret' ? r.ER[i] : r.wStar[i]
        points.push([i, t, z])
      }
    }
    return {
      points,
      shape: [NY, BL_NAMES.length] as [number, number],
      xRange: [0, BL_NAMES.length - 1] as [number, number],
      yRange: [t0 * 0.2, t0 * 4] as [number, number],
    }
  }, [lam, tau, del, q1, q2, s.metric, s.src])

  const stats = useMemo(() => {
    const r = blSolve(tau, { lam, del, q1, q2 })
    return {
      eq: r.Pi,
      po: r.ER,
      pv0: Math.sqrt(r.SigP[0][0]),
      pv3: Math.sqrt(r.SigP[3][3]),
      res1: r.res1,
      res2: r.res2,
    }
  }, [tau, lam, del, q1, q2])

  useEffect(() => {
    const t0 = performance.now()
    recordRun({
      modelId: 'bl',
      scenarioName: 'Live',
      inputs: { lam, tau, del, q1, q2, metric: s.metric, src: s.src },
      outputsSummary: { eqRet0: stats.eq[0], poRet0: stats.po[0], res1: stats.res1, res2: stats.res2 },
      runtimeMs: performance.now() - t0,
    })
  }, [lam, tau, del, q1, q2, s.metric, s.src])

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title="3D BLACK-LITTERMAN RETURN SURFACE"
        badge={s.src === 'views' ? 'VIEWS' : 'EQM'}
        badgeTone="green"
        onInfo={() => setInfo(true)}
        onBack={() => setView('index')}
        onReset={() => setResetToken((t) => t + 1)}
      />
      <ModelShell>
        <FavoritesBar />
        <WorkspacePanel />

        <SurfaceChart
          points={surface.points}
          dataShape={surface.shape}
          xName="ASSET"
          yName="τ"
          zName={s.metric === 'ret' ? 'RETURN' : 'WEIGHT'}
          xRange={surface.xRange}
          yRange={surface.yRange}
          xLabels={BL_NAMES}
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
                { value: 'ret', label: 'RETURNS' },
                { value: 'wgt', label: 'WEIGHTS' },
              ]}
              value={s.metric}
              onChange={(v) => s.set({ metric: v as BlMetric })}
            />
            <ParamLabel>Posterior Source</ParamLabel>
            <Seg
              options={[
                { value: 'views', label: 'VIEWS' },
                { value: 'eqm', label: 'EQM' },
              ]}
              value={s.src}
              onChange={(v) => s.set({ src: v as BlSrc })}
            />
            <Slider label="RISK AVERSION (λ)" min={1} max={100} step={1} value={s.lam} display={lam.toFixed(2)} onChange={(v) => s.set({ lam: v })} />
            <Slider label="UNCERTAINTY (τ)" min={1} max={300} step={1} value={s.tau} display={tau.toFixed(3)} onChange={(v) => s.set({ tau: v })} />
            <Slider label="VIEW UNCERT (δ)" min={1} max={50} step={1} value={s.del} display={del.toFixed(2)} onChange={(v) => s.set({ del: v })} />
            <Slider label="VIEW 1 · EQY−BND (Q)" min={-20} max={20} step={1} value={s.q1} display={(q1 * 100).toFixed(1) + '%'} onChange={(v) => s.set({ q1: v })} />
            <Slider label="VIEW 2 · GOLD (Q)" min={-20} max={30} step={1} value={s.q2} display={(q2 * 100).toFixed(1) + '%'} onChange={(v) => s.set({ q2: v })} />
          </Accordion>

          <Accordion title="◎ DISPLAY">
            <DisplayControls value={s} onChange={s.set} />
          </Accordion>
        </LeftPanel>

        <RightPanel>
          <div className="px-3.5 pt-3">
            <StatList>
              {BL_NAMES.map((name, i) => (
                <Stat key={`eq${i}`} k={`EQM Ret · ${name}`} v={signPct(stats.eq[i])} tone="price" />
              ))}
              {BL_NAMES.map((name, i) => (
                <Stat key={`po${i}`} k={`Post Ret · ${name}`} v={signPct(stats.po[i])} tone={stats.po[i] < 0 ? 'neg' : 'price'} />
              ))}
              <Stat k="Post Vol · Equity" v={(stats.pv0 * 100).toFixed(1) + '%'} />
              <Stat k="Post Vol · Crypto" v={(stats.pv3 * 100).toFixed(1) + '%'} />
              <Stat k="View 1 Match (EQY−BND)" v={signPct(stats.res1)} tone={Math.abs(stats.res1) < 1e-3 ? 'price' : 'default'} />
              <Stat k="View 2 Match (GOLD)" v={signPct(stats.res2)} tone={Math.abs(stats.res2) < 1e-3 ? 'price' : 'default'} />
            </StatList>
          </div>
          <Scale label={(s.metric === 'ret' ? 'POSTERIOR RETURN' : 'POSTERIOR WEIGHT') + (s.src === 'views' ? ' (VIEWS)' : ' (EQM)')} />
        </RightPanel>

        <Hint text="Drag to rotate • Scroll to zoom • Right-click to pan • Assets × τ" />
      </ModelShell>

      <FormulaModal open={info} title="Black-Litterman Model" formulas={BL_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
