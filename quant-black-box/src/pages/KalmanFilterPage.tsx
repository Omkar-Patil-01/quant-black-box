import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header, LeftPanel, ModelShell, Tier1Nav, Tier2Nav, BottomSheet, BottomMobileDock, MobileCanvasControls } from '../components/layout'
import { Accordion, Hint, ParamLabel, Seg, Slider, Stat, StatList, useHotkeys } from '../components/ui'
import DisplayControls from '../components/DisplayControls'
import FormulaModal from '../components/FormulaModal'
import RightSidebar from '../components/RightSidebar'
import { KF_FORMULAS } from '../lib/formulas'
import { kalmanFilter } from '../lib/math'
import type { KfParams, KfTickResult } from '../lib/math'
import { fetchKf } from '../lib/kfApi'
import { useIsMobile } from '../lib/hooks'
import { useApp } from '../store/app'
import { useWorkspace } from '../store/workspace'
import { useKf } from '../store/models'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  Cell,
} from 'recharts'

const ACCENT = '#FF5E00'

function MiniDashboard({ history, tick }: { history: KfTickResult[]; tick: number }) {
  const visible = history.slice(0, tick)
  if (visible.length === 0) return null

  const n = visible[0].filteredState.length
  const stateColors = ['#FF5E00', '#39FF14', '#00D4FF', '#FFD600', '#FF6EC7']

  const priceData = visible.map((r) => {
    const d: Record<string, number> = { step: r.step }
    for (let i = 0; i < n; i++) {
      d[`true_${i}`] = r.trueState[i]
      d[`est_${i}`] = r.filteredState[i]
      d[`upper_${i}`] = r.filteredState[i] + r.stateCovDiag[i]
      d[`lower_${i}`] = r.filteredState[i] - r.stateCovDiag[i]
    }
    if (r.step > 0) {
      for (let i = 0; i < r.observation.length; i++) {
        d[`obs_${i}`] = r.observation[i]
      }
    }
    return d
  })

  const innovData = visible.filter((r) => r.step > 0).map((r) => {
    const d: Record<string, number> = { step: r.step }
    for (let i = 0; i < r.innovation.length; i++) {
      d[`innov_${i}`] = r.innovation[i]
    }
    return d
  })

  const traceData = visible.map((r) => ({ step: r.step, traceP: r.traceP }))

  const lastTick = visible[visible.length - 1]
  const distBins = 20
  const distMean = lastTick.filteredState[0]
  const distStd = Math.sqrt(Math.max(0.001, lastTick.stateCovDiag[0] / 2))
  const distData: { bin: string; count: number }[] = []
  const binWidth = (distStd * 6) / distBins
  const binStart = distMean - distStd * 3
  for (let i = 0; i < distBins; i++) {
    const lo = binStart + i * binWidth
    const hi = lo + binWidth
    const mid = (lo + hi) / 2
    const pdf = Math.exp(-0.5 * ((mid - distMean) / distStd) ** 2) / (distStd * Math.sqrt(2 * Math.PI))
    distData.push({ bin: `${i}`, count: pdf * binWidth * 100 })
  }

  const maxInnov = Math.max(1, ...innovData.map((d) => Math.abs(d.innov_0 ?? 0)))
  const bound = distStd > 0 ? 2 * distStd : 1

  return (
    <div className="flex h-full w-full flex-col gap-1 p-2">
      <div className="min-h-0 flex-[3]">
        <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-label">Price Estimation</div>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={priceData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="step" tick={{ fontSize: 9, fill: '#666' }} stroke="#333" />
            <YAxis tick={{ fontSize: 9, fill: '#666' }} stroke="#333" domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: 4, fontSize: 10 }}
              labelStyle={{ color: '#888' }}
            />
            {Array.from({ length: n }, (_, i) => (
              <Line
                key={`upper_${i}`}
                type="monotone"
                dataKey={`upper_${i}`}
                stroke="none"
                fill={stateColors[i]}
                fillOpacity={0.08}
                strokeOpacity={0}
                dot={false}
                isAnimationActive={false}
                legendType="none"
              />
            ))}
            {Array.from({ length: n }, (_, i) => (
              <Line
                key={`lower_${i}`}
                type="monotone"
                dataKey={`lower_${i}`}
                stroke="none"
                fill={stateColors[i]}
                fillOpacity={0.08}
                strokeOpacity={0}
                dot={false}
                isAnimationActive={false}
                legendType="none"
              />
            ))}
            {Array.from({ length: n }, (_, i) => (
              <Line
                key={`true_${i}`}
                type="monotone"
                dataKey={`true_${i}`}
                stroke="#666"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {Array.from({ length: n }, (_, i) => (
              <Line
                key={`est_${i}`}
                type="monotone"
                dataKey={`est_${i}`}
                stroke={stateColors[i]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {Array.from({ length: Math.min(n, 1) }, (_, i) => (
              <Line
                key={`obs_${i}`}
                type="monotone"
                dataKey={`obs_${i}`}
                stroke="#71717a"
                strokeWidth={0}
                dot={{ r: 2, fill: '#71717a', stroke: 'none' }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="min-h-0 flex-1">
        <div className="flex h-full gap-1">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-label">Innovation Residuals</div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={innovData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="step" tick={{ fontSize: 8, fill: '#666' }} stroke="#333" />
                <YAxis tick={{ fontSize: 8, fill: '#666' }} stroke="#333" domain={[-maxInnov * 1.2, maxInnov * 1.2]} />
                <ReferenceLine y={bound} stroke="#FF5E00" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={-bound} stroke="#FF5E00" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={0} stroke="#444" />
                <Bar dataKey="innov_0" isAnimationActive={false}>
                  {innovData.map((entry, idx) => (
                    <Cell key={idx} fill={(entry.innov_0 ?? 0) >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-label">Predictive Distribution</div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={distData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="bin" tick={false} stroke="#333" />
                <YAxis tick={{ fontSize: 8, fill: '#666' }} stroke="#333" />
                <Bar dataKey="count" isAnimationActive={false}>
                  {distData.map((_, idx) => (
                    <Cell key={idx} fill={ACCENT} fillOpacity={0.4 + 0.6 * (idx / distBins)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-label">Covariance Trace</div>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={traceData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="step" tick={{ fontSize: 8, fill: '#666' }} stroke="#333" />
                <YAxis tick={{ fontSize: 8, fill: '#666' }} stroke="#333" />
                <Line
                  type="stepAfter"
                  dataKey="traceP"
                  stroke={ACCENT}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KalmanFilterPage() {
  const s = useKf()
  const setView = useApp((st) => st.setView)
  const mobilePanel = useApp((st) => st.mobilePanel)
  const setMobilePanel = useApp((st) => st.setMobilePanel)
  const mobile = useIsMobile()
  const [info, setInfo] = useState(false)
  const [, setResetToken] = useState(0)
  const recordRun = useWorkspace((st) => st.recordRun)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  useHotkeys({
    b: () => { if (!mobile) setLeftOpen((v) => !v) },
    r: () => { if (!mobile) setRightOpen((v) => !v) },
  })

  const kfParams: KfParams = {
    n: s.n,
    m: s.m,
    Q: s.Q,
    R: s.R,
    nDays: s.nDays,
    seed: s.seed,
  }

  const [fullHistory, setFullHistory] = useState<KfTickResult[]>([])
  const [tick, setTick] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const loadFromBackend = useCallback(async () => {
    try {
      const ticks = await fetchKf(kfParams)
      setFullHistory(ticks)
      setTick(ticks.length)
      setIsPlaying(false)
    } catch {
      const ticks = kalmanFilter(kfParams)
      setFullHistory(ticks)
      setTick(ticks.length)
      setIsPlaying(false)
    }
  }, [s.n, s.m, s.Q, s.R, s.nDays, s.seed])

  useEffect(() => {
    loadFromBackend()
  }, [loadFromBackend])

  useEffect(() => {
    if (!isPlaying || tick >= fullHistory.length) {
      if (tick >= fullHistory.length) setIsPlaying(false)
      return
    }
    const id = setTimeout(() => setTick((t) => t + 1), 300)
    return () => clearTimeout(id)
  }, [isPlaying, tick, fullHistory.length])

  const history = useMemo(() => fullHistory.slice(0, tick), [fullHistory, tick])

  useEffect(() => {
    if (tick === 0) return
    const t0 = performance.now()
    const last = fullHistory[Math.min(tick - 1, fullHistory.length - 1)]
    recordRun({
      modelId: 'kf',
      scenarioName: 'Live',
      inputs: { n: s.n, m: s.m, Q: s.Q, R: s.R, nDays: s.nDays },
      outputsSummary: {
        traceP: last.traceP,
        kGain: last.kalmanGain[0]?.[0] ?? 0,
        est: last.filteredState[0],
      },
      runtimeMs: performance.now() - t0,
    })
  }, [tick, s.n, s.m, s.Q, s.R, s.nDays])

  const lastTick = history.length > 0 ? history[history.length - 1] : null

  const metricsContent = (
    <StatList mobile={mobile}>
      <Stat k="KALMAN GAIN" v={lastTick ? (lastTick.kalmanGain[0]?.[0] ?? 0).toFixed(3) : '—'} tone="price" mobile={mobile} />
      <Stat k="INNOVATION" v={lastTick && tick > 0 ? lastTick.innovation[0]?.toFixed(4) ?? '—' : '—'} mobile={mobile} />
      <Stat k="CI 2-sigma" v={lastTick ? '+/- ' + (lastTick.stateCovDiag[0]?.toFixed(2) ?? '-') : '-'} mobile={mobile} />
      <Stat k="TRACE(P)" v={lastTick ? lastTick.traceP.toFixed(4) : '—'} mobile={mobile} />
      <Stat k="FILTERED" v={lastTick ? lastTick.filteredState[0]?.toFixed(2) : '—'} tone="price" mobile={mobile} />
      <Stat k="TRUE STATE" v={lastTick ? lastTick.trueState[0]?.toFixed(2) : '—'} mobile={mobile} />
      <Stat k="STEP" v={`${tick} / ${fullHistory.length}`} mobile={mobile} />
      <Stat k="Q (PROC)" v={s.Q.toFixed(4)} mobile={mobile} />
      <Stat k="R (OBS)" v={s.R.toFixed(4)} mobile={mobile} />
    </StatList>
  )

  const paramsContent = (
    <>
      <Accordion title="DATA FEED">
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`flex-1 cursor-pointer rounded border py-2 text-[10px] font-semibold tracking-[0.12em] transition-colors ${
              isPlaying ? 'border-white bg-white text-black' : 'border-white bg-black text-white'
            }`}
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            type="button"
            onClick={() => { if (tick < fullHistory.length) setTick((t) => t + 1) }}
            disabled={tick >= fullHistory.length}
            className="flex-1 cursor-pointer rounded border border-white bg-black py-2 text-[10px] font-semibold tracking-[0.12em] transition-colors hover:bg-white/10 disabled:opacity-30"
          >
            STEP +1
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setTick(0); setIsPlaying(false); setResetToken((prev) => prev + 1); }}
          className="w-full cursor-pointer rounded border border-white/20 bg-transparent py-2 text-[10px] font-semibold tracking-[0.12em] text-label transition-colors hover:border-white/40 hover:text-white mb-3"
        >
          RESET
        </button>
        <div className="mb-2 flex items-baseline justify-between">
          <label className="text-[9px] font-medium tracking-[0.12em] text-label">PROGRESS</label>
          <output className="font-mono text-[11px] font-medium text-white">{tick} / {fullHistory.length}</output>
        </div>
        <input
          type="range"
          min={0}
          max={fullHistory.length}
          step={1}
          value={tick}
          onChange={(e) => { setTick(Number(e.target.value)); setIsPlaying(false) }}
          style={{ background: `linear-gradient(90deg,${ACCENT} ${(tick / Math.max(1, fullHistory.length)) * 100}%,#262626 ${(tick / Math.max(1, fullHistory.length)) * 100}%)` }}
        />
      </Accordion>

      <Accordion title="STATE-SPACE">
        <ParamLabel>Number of States (n)</ParamLabel>
        <Seg
          options={[1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: String(v) }))}
          value={String(s.n)}
          onChange={(v) => s.set({ n: Number(v) })}
        />
        <ParamLabel>Observations (m)</ParamLabel>
        <Seg
          options={[1, 2, 3].map((v) => ({ value: String(v), label: String(v) }))}
          value={String(s.m)}
          onChange={(v) => s.set({ m: Number(v) })}
        />
        <Slider label="FORECAST HORIZON" min={1} max={60} step={1} value={s.nDays} display={`${s.nDays} steps`} onChange={(v) => s.set({ nDays: v })} mobile={mobile} />
      </Accordion>

      <Accordion title="NOISE TUNING">
        <Slider label="Q · PROCESS NOISE" min={0.0001} max={1} step={0.0001} value={s.Q} display={s.Q.toFixed(4)} onChange={(v) => s.set({ Q: v })} mobile={mobile} />
        <Slider label="R · OBSERVATION NOISE" min={0.0001} max={1} step={0.0001} value={s.R} display={s.R.toFixed(4)} onChange={(v) => s.set({ R: v })} mobile={mobile} />
        <div className="mt-2 text-[8px] text-label leading-relaxed">
          Low Q → smooth estimate, high lag. High Q → snaps to ticks.<br />
          Low R → trusts observations. High R → trusts model.
        </div>
      </Accordion>

      <Accordion title="SEED">
        <Slider label="RNG SEED" min={1} max={99999} step={1} value={s.seed} display={String(s.seed)} onChange={(v) => s.set({ seed: v })} mobile={mobile} />
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
          title="KALMAN FILTER"
          badge="LIVE"
          badgeTone="green"
          onInfo={() => setInfo(true)}
          onBack={() => setView('index')}
          onReset={() => setResetToken((prev) => prev + 1)}
        />

        <div className="relative min-h-0 flex-1">
          {mobilePanel === 'canvas' && (
            <>
              <MiniDashboard history={history} tick={tick} />
              <MobileCanvasControls
                onReset={() => { setTick(0); setIsPlaying(false) }}
                onColorScheme={() => {}}
                onFullscreen={() => {
                  if (document.fullscreenElement) document.exitFullscreen()
                  else document.documentElement.requestFullscreen()
                }}
              />
            </>
          )}
        </div>

        <BottomSheet open={mobilePanel === 'params'} onClose={() => setMobilePanel('canvas')} title="Parameters & Controls">
          {paramsContent}
        </BottomSheet>

        <BottomSheet open={mobilePanel === 'metrics'} onClose={() => setMobilePanel('canvas')} title="Live Metrics">
          {metricsContent}
        </BottomSheet>

        <BottomMobileDock />
        <FormulaModal open={info} title="Kalman Filter" formulas={KF_FORMULAS} onClose={() => setInfo(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Tier1Nav />
      <Tier2Nav />
      <Header
        title="KALMAN FILTER"
        badge={isPlaying ? 'LIVE' : tick > 0 ? 'PAUSED' : 'READY'}
        badgeTone={isPlaying ? 'green' : 'red'}
        onInfo={() => setInfo(true)}
        onBack={() => setView('index')}
        onReset={() => { setTick(0); setIsPlaying(false); setResetToken((prev) => prev + 1) }}
      />
      <ModelShell>
        {leftOpen && (
          <LeftPanel>
            {paramsContent}
          </LeftPanel>
        )}

        <div className="relative min-w-0 flex-1">
          <MiniDashboard history={history} tick={tick} />
          <Hint text="PLAY to animate · STEP for single tick · Adjust Q/R to see immediate effect · [B] left · [R] right" />
        </div>

        {rightOpen && (
          <RightSidebar metricsContent={metricsContent} scaleLabel="KALMAN GAIN" />
        )}
      </ModelShell>

      <FormulaModal open={info} title="Kalman Filter" formulas={KF_FORMULAS} onClose={() => setInfo(false)} />
    </div>
  )
}
