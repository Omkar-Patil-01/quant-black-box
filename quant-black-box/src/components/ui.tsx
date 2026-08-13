import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import type { Scheme } from '../lib/colors'
import { SCHEMES } from '../lib/colors'

export interface SegOption {
  value: string
  label: string
}

export function Seg({ options, value, onChange }: { options: SegOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3.5 flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 cursor-pointer rounded-full border py-2 text-[10px] font-semibold tracking-[0.12em] transition-colors ${
            value === o.value ? 'border-white bg-white text-black' : 'border-white bg-black text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ParamLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-label">{children}</div>
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  display: string
  onChange: (v: number) => void
}) {
  const p = ((value - min) / (max - min)) * 100
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-[9px] font-medium tracking-[0.12em] text-label">{label}</label>
        <output className="font-mono text-[11px] font-medium text-white">{display}</output>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(90deg,#4f46e5 ${p}%,#262626 ${p}%)` }}
      />
    </div>
  )
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5">
      <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-[34px] cursor-pointer rounded-full transition-colors ${
          checked ? 'bg-green' : 'bg-track'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
            checked ? 'left-4 bg-black' : 'left-0.5 bg-[#888888]'
          }`}
        />
      </button>
    </label>
  )
}

export function ColorDropdown({ value, onChange }: { value: Scheme; onChange: (v: Scheme) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const current = SCHEMES.find((s) => s.value === value) ?? SCHEMES[0]
  return (
    <div className="relative mb-3.5" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded border border-border bg-[#0a0a0a] px-2.5 py-[7px] font-mono text-[10px] text-white hover:border-[#555555]"
      >
        <span className={`sw ${current.swatchClass}`} />
        <span>{current.label}</span>
        <ChevronDown size={11} className="ml-auto text-[#666666]" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded border border-border bg-[#0a0a0a]">
          {SCHEMES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                onChange(s.value)
                setOpen(false)
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 font-mono text-[10px] hover:bg-[#141414] ${
                s.value === value ? 'text-white' : 'text-label'
              }`}
            >
              <span className={`sw ${s.swatchClass}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between px-3.5 py-3 text-left"
      >
        <span className="text-[10px] font-semibold tracking-[0.14em] text-white">{title}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-[#666666]"
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-3.5 pb-4 pt-1">{children}</div>
      </motion.div>
    </div>
  )
}

export type StatTone = 'default' | 'price' | 'neg'

export function Stat({ k, v, tone = 'default' }: { k: string; v: string; tone?: StatTone }) {
  const toneCls = tone === 'price' ? 'text-green' : tone === 'neg' ? 'text-red' : 'text-white'
  return (
    <div className="flex items-center justify-between border-b border-[#131313] py-[7px] last:border-b-0">
      <span className="text-[8.5px] font-medium uppercase tracking-[0.14em] text-label">{k}</span>
      <span className={`font-mono text-[11px] font-medium ${toneCls}`}>{v}</span>
    </div>
  )
}

export function StatList({ children }: { children: ReactNode }) {
  return <div className="pb-2.5">{children}</div>
}

export function Scale({ label }: { label: string }) {
  return (
    <div className="mt-auto border-t border-line px-3.5 pb-3.5 pt-3">
      <div className="mb-2 flex justify-between text-[8px] font-semibold uppercase tracking-[0.14em] text-label">
        <span>{label}</span>
        <span />
      </div>
      <div className="scale-bar h-2 rounded" />
      <div className="mt-1.5 flex justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-mute">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}

export function IconBtn({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-[7px] rounded border border-border bg-transparent px-3 py-1.5 font-sans text-[10px] font-medium text-white transition-colors hover:border-[#666666]"
    >
      {icon}
      {children}
    </button>
  )
}

export function Hint({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute bottom-3.5 left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap font-mono text-[9px] tracking-[0.04em] text-mute">
      {text}
    </div>
  )
}
