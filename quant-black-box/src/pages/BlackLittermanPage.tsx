import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Header, LeftPanel, ModelShell, ParamsReveal, Tier1Nav, Tier2Nav, BottomSheet, BottomMobileDock, MobileCanvasControls } from '../components/layout'
import { Accordion, Chip, Hint, OutputCard, ParamLabel, Seg, Select, Slider, TermGroup, TermRow, useHotkeys } from '../components/ui'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import LiveMarketIngestion from '../components/LiveMarketIngestion'
import RightSidebar from '../components/RightSidebar'
import { BL_FORMULAS } from '../lib/formulas'
import { BL_NAMES, BL_WMKT, blSolve } from '../lib/math'
import { signPct } from '../lib/format'
import { InlineMath } from 'react-katex'
import { useIsMobile } from '../lib/hooks'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { BlMetric, BlSrc, BlState } from '../store/models'
import { useBl } from '../store/models'

export default function BlackLittermanPage() {
  const s = useBl()
  const setView = useApp((st) => st.setView)
  const mobilePanel = useApp((st) => st.mobilePanel)
  const setMobilePanel = useApp((st) => st.setMobilePanel)
  const mobile = useIsMobile()
  const [info, setInfo] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const recordRun = useWorkspace((st) => st.recordRun)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const gridN = mobile ? 18 : 25

  useHotkeys({
    b: () => { if (!mobile) setLeftOpen((v) => !v) },
    r: () => { if (!mobile) setRightOpen((v) => !v) },
    m: () => {
      const el = document.getElementById('market-data-input')
      if (el) el.focus()
    },
  })

  const [preset, setPreset] = useState('')
  const applyPreset = useCallback((v: string) => {
    setPreset(v)
    const p = PRESETS[Number(v)]
    if (p) s.set(p.p)
  }, [s.set])

  const lam = s.lam / 10
  const tau = s.tau / 1000
  const del = s.del / 100
  const q1 = s.q1 / 100
  const q2 = s.q2 / 100

  /** Literature calibrations in this store's units: lam = λ×10, tau = τ×1000, del = δ×100, q = view×100. */
  const PRESETS: { label: string; p: Partial<BlState> }[] = [
    { label: 'Black-Litterman 1992', p: { lam: 25, tau: 10, del: 10 } },
    { label: 'He-Litterman 1999', p: { lam: 25, tau: 25, del: 25 } },
    { label: 'Satchell-Scowcroft Ex.1 (τ clipped)', p: { lam: 50, tau: 300, del: 5, q1: 5 } },
    { label: 'Satchell-Scowcroft Ex.2 (τ clipped)', p: { lam: 30, tau: 300, del: 3, q2: 2 } },
    { label: 'Idzorek 2005 (λ≈3.07)', p: { lam: 31, tau: 25, del: 10 } },
  ]

  const surface = useMemo(() => {
    const NY = gridN
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
  }, [lam, tau, del, q1, q2, s.metric, s.src, gridN])

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

  const tilt = useMemo(() => {
    const r = blSolve(tau, { lam, del, q1, q2 })
    const prior = s.metric === 'ret' ? r.Pi : BL_WMKT
    const post = s.metric === 'ret' ? r.ER : r.wStar
    const t = post.map((v, i) => v - prior[i])
    return { prior, post, tilt: t }
  }, [tau, lam, del, q1, q2, s.metric])

  const sweep = useMemo(() => {
    const NY = mobile ? 18 : 30
    const t0 = tau
    const ts: number[] = []
    for (let j = 0; j < NY; j++) ts.push(t0 * (0.2 + (3.8 * j) / (NY - 1)))
    const rows = BL_NAMES.map((_, i) =>
      ts.map((t) => {
        const r = blSolve(t, { lam, del, q1, q2 })
        return s.metric === 'ret' ? r.ER[i] : r.wStar[i]
      }),
    )
    return { ts, rows }
  }, [tau, lam, del, q1, q2, s.metric, mobile])

  const LINE_COLORS = ['#22d3ee', '#f59e0b', '#34d399', '#a78bfa']

  const tiltData = BL_NAMES.map((name, i) => ({
    asset: name,
    eqm: tilt.prior[i],
    post: tilt.post[i],
  }))

  const sweepData = sweep.ts.map((t, j) => {
    const row: Record<string, number> = { tau: t }
    BL_NAMES.forEach((_, i) => {
      row[`a${i}`] = sweep.rows[i][j]
    })
    return row
  })

  // output-panel detail: view-calibration status from the existing residual rule (|res| < 1e-3 = captured)
  const tiltAbs = tilt.tilt.map(Math.abs)
  const maxTilt = Math.max(...tiltAbs)
  const sumTilt = tiltAbs.reduce((a, b) => a + b, 0)
  const resOk = (r: number) => Math.abs(r) < 1e-3
  const profile =
    resOk(stats.res1) && resOk(stats.res2) ? 'CAPTURED' : resOk(stats.res1) || resOk(stats.res2) ? 'PARTIAL' : 'DIVERGED'
  const profileCls =
    profile === 'CAPTURED'
      ? 'border-green/40 bg-green/10 text-green'
      : profile === 'PARTIAL'
        ? 'border-accent-mc/40 bg-accent-mc/10 text-accent-mc'
        : 'border-red/40 bg-red/10 text-red'

  const metricsContent = (
    <div className="space-y-2">
      {/* model header: the posterior formula + the run's fixed parameters */}
      <div className="border border-border bg-[#09090b] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="text-[12px] leading-none text-white">
            <InlineMath math={String.raw`\mu^{*} = \left[(\tau\Sigma)^{-1} + P^\top \Omega^{-1} P\right]^{-1} \left[(\tau\Sigma)^{-1} \Pi + P^\top \Omega^{-1} Q\right]`} />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-label">
            BL POSTERIOR · λ {lam.toFixed(2)} · τ {tau.toFixed(3)} · δ {del.toFixed(2)} ·{' '}
            {s.src === 'views' ? 'VIEWS' : 'EQM'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <OutputCard title="Run Config">
          <TermRow k="Confidence λ" v={lam.toFixed(2)} />
          <TermRow k="Scale τ" v={tau.toFixed(3)} />
          <TermRow k="Uncertainty δ" v={del.toFixed(2)} />
          <TermRow k="View 1" v={(q1 * 100).toFixed(1) + '%'} />
          <TermRow k="View 2" v={(q2 * 100).toFixed(1) + '%'} />
          <TermRow k="Metric" v={s.metric === 'wgt' ? 'Weights' : 'Returns'} />
        </OutputCard>

        <div className="space-y-2">
          <OutputCard title="Posterior Equity — Views vs Equilibrium">
            <div className="py-1 text-center">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-label">Posterior (EQUITY)</div>
              <div
                className={`mt-0.5 font-mono text-[26px] font-bold tabular-nums ${
                  stats.po[0] < 0 ? 'text-red' : 'text-green'
                }`}
              >
                {signPct(stats.po[0])}
              </div>
              <div className="mt-1.5 flex justify-center gap-8">
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-label">Equilibrium</div>
                  <div className="font-mono text-[14px] font-semibold tabular-nums text-white">
                    {signPct(stats.eq[0])}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-label">Tilt</div>
                  <div
                    className={`font-mono text-[14px] font-semibold tabular-nums ${
                      tilt.tilt[0] < 0 ? 'text-red' : 'text-green'
                    }`}
                  >
                    {signPct(tilt.tilt[0])}
                  </div>
                </div>
              </div>
            </div>
          </OutputCard>

          <OutputCard title="View Calibration Diagnostics">
            <TermRow
              k="View 1 match"
              v={signPct(stats.res1)}
              tone={resOk(stats.res1) ? 'price' : 'neg'}
            />
            <TermRow
              k="View 2 match"
              v={signPct(stats.res2)}
              tone={resOk(stats.res2) ? 'price' : 'neg'}
            />
            <TermRow k="Max tilt" v={signPct(maxTilt)} />
            <TermRow k="Σ|Tilt|" v={signPct(sumTilt)} />
          </OutputCard>

          <div
            className={`border px-3 py-2 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.16em] ${profileCls}`}
          >
            View calibration profile: {profile}
          </div>
        </div>

        <OutputCard title="Equilibrium Pi (EQM)">
          {BL_NAMES.map((name, i) => (
            <TermRow key={`eq${i}`} k={name} v={signPct(stats.eq[i])} tone="price" />
          ))}
        </OutputCard>
      </div>

      <TermGroup title="Posterior">
        {BL_NAMES.map((name, i) => (
          <TermRow key={`po${i}`} k={name} v={signPct(stats.po[i])} tone={stats.po[i] < 0 ? 'neg' : 'price'} />
        ))}
        <TermRow k="Post Vol Equity" v={(stats.pv0 * 100).toFixed(1) + '%'} />
        <TermRow k="Post Vol Crypto" v={(stats.pv3 * 100).toFixed(1) + '%'} />
      </TermGroup>

      {s.view === 'tilt' && (
        <TermGroup title="Tilt (Post − EQM)">
          <TermRow k="Max Tilt" v={signPct(maxTilt)} />
          <TermRow k="Σ|Tilt|" v={signPct(sumTilt)} />
          {BL_NAMES.map((name, i) => (
            <TermRow key={name} k={name} v={signPct(tilt.tilt[i])} tone={tilt.tilt[i] < 0 ? 'neg' : 'price'} />
          ))}
        </TermGroup>
      )}
    </div>
  )

  const paramsContent = (
    <>
      <LiveMarketIngestion onApply={() => {}} />

      <Accordion
        title="PARAMETERS"
        summary={
          <>
            <Chip k="View" v={s.view === 'surface' ? '3D' : '2D'} />
            <Chip k="Metric" v={s.metric === 'wgt' ? 'Weights' : 'Returns'} />
            <Chip k="λ" v={lam.toFixed(2)} />
            <Chip k="τ" v={tau.toFixed(3)} />
            <Chip k="δ" v={del.toFixed(2)} />
            <Chip k="V1" v={`${(q1 * 100).toFixed(1)}%`} />
            <Chip k="V2" v={`${(q2 * 100).toFixed(1)}%`} />
          </>
        }
      >
        <ParamLabel>Surface Metric</ParamLabel>
        <Seg
          options={[
            { value: 'ret', label: 'RETURNS' },
            { value: 'wgt', label: 'WEIGHTS' },
          ]}
          value={s.metric}
          onChange={(v) => s.set({ metric: v as BlMetric })}
        />
        <ParamLabel>Chart</ParamLabel>
        <Seg
          options={[
            { value: 'tilt', label: '2D CHART' },
            { value: 'surface', label: '3D SURFACE' },
          ]}
          value={s.view}
          onChange={(v) => s.set({ view: v as 'tilt' | 'surface' })}
        />
        <Select
          label="PRESET"
          value={preset}
          options={[
            { value: '', label: 'Custom' },
            ...PRESETS.map((p, i) => ({ value: String(i), label: p.label })),
          ]}
          onChange={applyPreset}
        />
        {s.view === 'surface' && (
          <>
            <ParamLabel>Posterior Source</ParamLabel>
            <Seg
              options={[
                { value: 'views', label: 'VIEWS' },
                { value: 'eqm', label: 'EQM' },
              ]}
              value={s.src}
              onChange={(v) => s.set({ src: v as BlSrc })}
            />
          </>
        )}
        <Slider label="RISK AVERSION (λ)" min={1} max={100} step={1} value={s.lam} display={lam.toFixed(2)} onChange={(v) => s.set({ lam: v })} mobile={mobile} />
        <Slider label="UNCERTAINTY (τ)" min={1} max={300} step={1} value={s.tau} display={tau.toFixed(3)} onChange={(v) => s.set({ tau: v })} mobile={mobile} />
        <Slider label="VIEW UNCERT (δ)" min={1} max={50} step={1} value={s.del} display={del.toFixed(2)} onChange={(v) => s.set({ del: v })} mobile={mobile} />
        <Slider label="VIEW 1 EQY-BND" min={-20} max={20} step={1} value={s.q1} display={(q1 * 100).toFixed(1) + '%'} onChange={(v) => s.set({ q1: v })} mobile={mobile} />
        <Slider label="VIEW 2 GOLD" min={-20} max={30} step={1} value={s.q2} display={(q2 * 100).toFixed(1) + '%'} onChange={(v) => s.set({ q2: v })} mobile={mobile} />
      </Accordion>

      {s.view === 'surface' && (
        <Accordion title="DISPLAY">
          <DisplayControls value={s} onChange={s.set} />
        </Accordion>
      )}
    </>
  )

  const chartTitle =
    s.view === 'tilt' ? '2D BLACK-LITTERMAN TILT' : '3D BLACK-LITTERMAN RETURN SURFACE'

  const chartHint =
    s.view === 'tilt'
      ? `Scroll: Zoom · Drag: Pan · Tau sweep × assets · [B] left · [R] right`
      : 'Drag to rotate · Scroll to zoom · Right-click to pan · Assets × τ · [B] left · [R] right'

  const chartCanvas =
    s.view === 'tilt' ? (
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tiltData} margin={{ top: 10, right: 20, bottom: 8, left: 8 }}>
              <XAxis dataKey="asset" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tickFormatter={signPct} tick={{ fontSize: 9 }} width={40} />
              <Bar dataKey="eqm" name="EQM" fill="#94a3b8" radius={[2, 2, 0, 0]} />
              <Bar dataKey="post" name="POST" fill="#22d3ee" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="relative min-h-0 flex-1 border-t border-line">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sweepData} margin={{ top: 10, right: 24, bottom: 8, left: 40 }}>
              <XAxis dataKey="tau" tickFormatter={(v: number) => v.toFixed(2)} tick={{ fontSize: 9 }} />
              <YAxis domain={['auto', 'auto']} tickFormatter={signPct} tick={{ fontSize: 9 }} width={40} />
              <Legend verticalAlign="top" align="right" />
              {BL_NAMES.map((name, i) => (
                <Line key={name} dataKey={`a${i}`} name={name} type="monotone" stroke={LINE_COLORS[i]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    ) : (
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
        mobile={mobile}
      />
    )

  if (mobile) {
    return (
      <div className="flex h-screen flex-col">
        <Header
          title={chartTitle}
          badge={s.src === 'views' ? 'VIEWS' : 'EQM'}
          badgeTone="green"
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

        <BottomSheet open={mobilePanel === 'metrics'} onClose={() => setMobilePanel('canvas')} title="Metrics & Results">
          {metricsContent}
        </BottomSheet>

        <BottomMobileDock />
        <FormulaModal open={info} title="Black-Litterman Model" formulas={BL_FORMULAS} onClose={() => setInfo(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title={chartTitle}
        badge={s.src === 'views' ? 'VIEWS' : 'EQM'}
        badgeTone="green"
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
            <RightSidebar metricsContent={metricsContent} scaleLabel={(s.metric === 'ret' ? 'POSTERIOR RETURN' : 'POSTERIOR WEIGHT') + (s.src === 'views' ? ' (VIEWS)' : ' (EQM)')} />
          )}
        </div>
      </ModelShell>

      <FormulaModal open={info} title="Black-Litterman Model" formulas={BL_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
