import { useEffect, useMemo, useState } from 'react'
import { Header, LeftPanel, ModelShell, Tier1Nav, Tier2Nav, BottomSheet, BottomMobileDock, MobileCanvasControls } from '../components/layout'
import { Accordion, Hint, ParamLabel, Seg, Slider, Stat, StatList, useHotkeys } from '../components/ui'
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

  const metricsContent = (
    <StatList mobile={mobile}>
      <Stat k="Risk-Free" v={pct(params.r, 2)} tone="price" mobile={mobile} />
      <Stat k="Mkt Premium" v={pct(params.lam, 2)} tone="price" mobile={mobile} />
      <Stat k="Size Premium" v={pct(params.lams, 2)} tone="price" mobile={mobile} />
      <Stat k="Value Premium" v={pct(params.lamv, 2)} tone="price" mobile={mobile} />
      <Stat k="Beta HML" v={params.b3.toFixed(2)} mobile={mobile} />
      <Stat k="Alpha" v={pct(params.al, 2)} tone="price" mobile={mobile} />
      <Stat k="Fair Return" v={pct(stats.fair)} tone="price" mobile={mobile} />
      <Stat k="Alpha-Adj" v={pct(stats.aadj)} tone="price" mobile={mobile} />
      <Stat k="Zero-Beta" v={pct(stats.zb)} mobile={mobile} />
      <Stat k="Slope ∂E/∂βM" v={'+' + (params.lam * 100).toFixed(2) + '%'} mobile={mobile} />
    </StatList>
  )

  const paramsContent = (
    <>
      <LiveMarketIngestion onApply={() => {}} />

      <Accordion title="PARAMETERS">
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
          <LeftPanel>
            {paramsContent}
          </LeftPanel>
        )}

        <div className="relative min-w-0 flex-1">
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
      </ModelShell>

      <FormulaModal open={info} title="Arbitrage Pricing Theory" formulas={APT_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
