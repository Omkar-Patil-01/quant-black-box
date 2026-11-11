import { useEffect, useMemo, useState } from 'react'
import { Header, LeftPanel, ModelShell, ParamsReveal, Tier1Nav, Tier2Nav, BottomSheet, BottomMobileDock, MobileCanvasControls } from '../components/layout'
import { Accordion, Chip, Hint, OutputCard, ParamLabel, Seg, Slider, TermGroup, TermRow, useHotkeys } from '../components/ui'
import SurfaceChart from '../components/SurfaceChart'
import type { SurfacePoint } from '../components/SurfaceChart'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import LiveMarketIngestion from '../components/LiveMarketIngestion'
import RightSidebar from '../components/RightSidebar'
import { APT_FORMULAS } from '../lib/formulas'
import { aptRet } from '../lib/math'
import type { AptParams } from '../lib/math'
import { pct } from '../lib/format'
import { InlineMath } from 'react-katex'
import { useIsMobile } from '../lib/hooks'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import type { AptMetric } from '../store/models'
import { useApt } from '../store/models'

export default function AptPage() {
  const s = useApt()
  const setView = useApp((st) => st.setView)
  const mobilePanel = useApp((st) => st.mobilePanel)
  const setMobilePanel = useApp((st) => st.setMobilePanel)
  const mobile = useIsMobile()
  const [info, setInfo] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const recordRun = useWorkspace((st) => st.recordRun)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const gridN = mobile ? 20 : 30

  useHotkeys({
    b: () => { if (!mobile) setLeftOpen((v) => !v) },
    r: () => { if (!mobile) setRightOpen((v) => !v) },
    m: () => {
      const el = document.getElementById('market-data-input')
      if (el) el.focus()
    },
  })

  const params: AptParams = {
    r: s.r / 100,
    lam: s.lam / 100,
    lams: s.lams / 100,
    lamv: s.lamv / 100,
    b3: s.b3 / 100,
    al: s.al / 100,
  }

  const surface = useMemo(() => {
    const N = gridN
    const x0 = 0
    const x1 = 2
    const y0 = -1
    const y1 = 1
    const points: SurfacePoint[] = []
    for (let i = 0; i < N; i++) {
      const b1 = x0 + ((x1 - x0) * i) / (N - 1)
      for (let j = 0; j < N; j++) {
        const b2 = y0 + ((y1 - y0) * j) / (N - 1)
        points.push([b1, b2, aptRet(b1, b2, s.metric === 'alpha', params)])
      }
    }
    return {
      points,
      shape: [N, N] as [number, number],
      xRange: [x0, x1] as [number, number],
      yRange: [y0, y1] as [number, number],
    }
  }, [params, s.metric, gridN])

  const stats = useMemo(() => {
    const fair = aptRet(1, 0.5, false, params)
    const aadj = aptRet(1, 0.5, true, params)
    const zb = aptRet(0, 0, false, params)
    return { fair, aadj, zb }
  }, [params])

  useEffect(() => {
    const t0 = performance.now()
    recordRun({
      modelId: 'apt',
      scenarioName: 'Live',
      inputs: { r: s.r, lam: s.lam, lams: s.lams, lamv: s.lamv, b3: s.b3, al: s.al, metric: s.metric },
      outputsSummary: { fair: stats.fair, aadj: stats.aadj, zb: stats.zb },
      runtimeMs: performance.now() - t0,
    })
  }, [s.r, s.lam, s.lams, s.lamv, s.b3, s.al, s.metric])

  // alpha drives the profile badge: |α| ≥ 0.5% → ALPHA PREMIUM / ALPHA DISCOUNT, else FAIRLY PRICED
  const profile = params.al >= 0.005 ? 'ALPHA PREMIUM' : params.al <= -0.005 ? 'ALPHA DISCOUNT' : 'FAIRLY PRICED'
  const profileCls =
    params.al >= 0.005
      ? 'border-green/40 bg-green/10 text-green'
      : params.al <= -0.005
        ? 'border-red/40 bg-red/10 text-red'
        : 'border-accent-mc/40 bg-accent-mc/10 text-accent-mc'

  const metricsContent = (
    <div className="space-y-2">
      {/* model header: the APT return formula + the run's fixed parameters */}
      <div className="border border-border bg-[#09090b] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="text-[12px] leading-none text-white">
            <InlineMath math={String.raw`\mathbb{E}[R] = r + \beta_M \lambda_M + \beta_S \lambda_S + \beta_V \lambda_V`} />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-label">
            APT · r {s.r.toFixed(1)}% · λM {s.lam.toFixed(1)}% · λS {s.lams.toFixed(1)}% · λV {s.lamv.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <OutputCard title="Run Config">
          <TermRow k="Risk-Free r" v={pct(params.r, 2)} tone="price" />
          <TermRow k="Mkt Premium λM" v={pct(params.lam, 2)} tone="price" />
          <TermRow k="Size Premium λS" v={pct(params.lams, 2)} tone="price" />
          <TermRow k="Value Premium λV" v={pct(params.lamv, 2)} tone="price" />
          <TermRow k="Beta HML β3" v={params.b3.toFixed(2)} />
          <TermRow k="Alpha α" v={pct(params.al, 2)} tone={params.al < 0 ? 'neg' : 'price'} />
        </OutputCard>

        <div className="space-y-2">
          <OutputCard title="Fair Return — βM 1.0 / βS 0.5">
            <div className="py-1 text-center">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-label">Fair Return</div>
              <div className="mt-0.5 font-mono text-[26px] font-bold tabular-nums text-green">{pct(stats.fair)}</div>
              <div className="mt-1.5 flex justify-center gap-8">
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-label">Alpha-Adj</div>
                  <div className="font-mono text-[14px] font-semibold tabular-nums text-white">{pct(stats.aadj)}</div>
                </div>
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-label">Zero-Beta</div>
                  <div className="font-mono text-[14px] font-semibold tabular-nums text-white">{pct(stats.zb)}</div>
                </div>
              </div>
            </div>
          </OutputCard>

          <OutputCard title="Factor Diagnostics">
            <TermRow k="Slope ∂E/∂βM" v={'+' + (params.lam * 100).toFixed(2) + '%'} />
            <TermRow k="Alpha contribution" v={pct(params.al, 2)} tone={params.al < 0 ? 'neg' : 'price'} />
            <TermRow k="Premia stack" v={pct(params.lam + params.lams + params.lamv, 2)} tone="price" />
            <TermRow k="Total expected" v={pct(stats.fair)} tone="price" />
          </OutputCard>

          <div
            className={`border px-3 py-2 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.16em] ${profileCls}`}
          >
            Alpha profile: {profile}
          </div>
        </div>

        <OutputCard title="Model Output">
          <TermRow k="Fair Return" v={pct(stats.fair)} tone="price" />
          <TermRow k="Alpha-Adj" v={pct(stats.aadj)} tone="price" />
          <TermRow k="Zero-Beta" v={pct(stats.zb)} />
          <TermRow k="Slope ∂E/∂βM" v={'+' + (params.lam * 100).toFixed(2) + '%'} />
        </OutputCard>
      </div>

      <TermGroup title="Factor Premia">
        <TermRow k="Risk-Free" v={pct(params.r, 2)} tone="price" />
        <TermRow k="Mkt Premium" v={pct(params.lam, 2)} tone="price" />
        <TermRow k="Size Premium" v={pct(params.lams, 2)} tone="price" />
        <TermRow k="Value Premium" v={pct(params.lamv, 2)} tone="price" />
      </TermGroup>

      <TermGroup title="Loadings & Alpha">
        <TermRow k="Beta HML" v={params.b3.toFixed(2)} />
        <TermRow k="Alpha" v={pct(params.al, 2)} tone="price" />
      </TermGroup>
    </div>
  )

  const paramsContent = (
    <>
      <LiveMarketIngestion onApply={() => {}} />

      <Accordion
        title="PARAMETERS"
        summary={
          <>
            <Chip k="Metric" v={s.metric === 'alpha' ? 'Alpha' : 'Fair'} />
            <Chip k="r" v={`${s.r.toFixed(1)}%`} />
            <Chip k="λM" v={`${s.lam.toFixed(1)}%`} />
            <Chip k="λS" v={`${s.lams.toFixed(1)}%`} />
            <Chip k="λV" v={`${s.lamv.toFixed(1)}%`} />
          </>
        }
      >
        <ParamLabel>Surface Metric</ParamLabel>
        <Seg
          options={[
            { value: 'fair', label: 'FAIR' },
            { value: 'alpha', label: 'ALPHA' },
          ]}
          value={s.metric}
          onChange={(v) => s.set({ metric: v as AptMetric })}
        />
        <Slider label="RISK-FREE (R)" min={-2} max={10} step={1} value={s.r} display={s.r.toFixed(1) + '%'} onChange={(v) => s.set({ r: v })} mobile={mobile} />
        <Slider label="MKT PREM (λM)" min={0} max={20} step={1} value={s.lam} display={s.lam.toFixed(1) + '%'} onChange={(v) => s.set({ lam: v })} mobile={mobile} />
        <Slider label="SIZE PREM (λS)" min={-10} max={10} step={1} value={s.lams} display={s.lams.toFixed(1) + '%'} onChange={(v) => s.set({ lams: v })} mobile={mobile} />
        <Slider label="VALUE PREM (λV)" min={-10} max={10} step={1} value={s.lamv} display={s.lamv.toFixed(1) + '%'} onChange={(v) => s.set({ lamv: v })} mobile={mobile} />
        <Slider label="BETA HML (β3)" min={-200} max={200} step={1} value={s.b3} display={params.b3.toFixed(2)} onChange={(v) => s.set({ b3: v })} mobile={mobile} />
        <Slider label="ALPHA (α)" min={-10} max={10} step={1} value={s.al} display={(s.al >= 0 ? '+' : '') + s.al.toFixed(1) + '%'} onChange={(v) => s.set({ al: v })} mobile={mobile} />
      </Accordion>

      <Accordion title="DISPLAY">
        <DisplayControls value={s} onChange={s.set} />
      </Accordion>
    </>
  )

  if (mobile) {
    return (
      <div className="flex h-screen flex-col">
        <Header
          title="3D ARBITRAGE PRICING THEORY PLANE"
          badge={s.metric === 'fair' ? 'FAIR' : 'ALPHA'}
          badgeTone="green"
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
                xName="β MARKET"
                yName="β SIZE"
                zName="E[R]"
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
        <FormulaModal open={info} title="Arbitrage Pricing Theory" formulas={APT_FORMULAS} onClose={() => setInfo(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title="3D ARBITRAGE PRICING THEORY PLANE"
        badge={s.metric === 'fair' ? 'FAIR' : 'ALPHA'}
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
            <SurfaceChart
              points={surface.points}
              dataShape={surface.shape}
              xName="β MARKET"
              yName="β SIZE"
              zName="E[R]"
              xRange={surface.xRange}
              yRange={surface.yRange}
              scheme={s.scheme}
              wire={s.wire}
              grid={s.grid}
              axes={s.axes}
              rot={s.rot}
              resetToken={resetToken}
            />
            <Hint text="Drag to rotate · Scroll to zoom · Right-click to pan · E[R] = r + βM·λM + βS·λS + βV·λV + α · [B] left · [R] right" />
          </div>

          {rightOpen && (
            <RightSidebar metricsContent={metricsContent} scaleLabel={s.metric === 'alpha' ? 'ALPHA-ADJ RETURN' : 'FAIR RETURN'} />
          )}
        </div>
      </ModelShell>

      <FormulaModal open={info} title="Arbitrage Pricing Theory" formulas={APT_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
