import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { BlockMath } from 'react-katex'

export interface FormulaDef {
  label: string
  tex: string
}

export default function FormulaModal({
  open,
  title,
  formulas,
  onClose,
}: {
  open: boolean
  title: string
  formulas: FormulaDef[]
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-md overflow-y-auto rounded-md border border-border bg-panel p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white">{title}</span>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer text-label transition-colors hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-5">
              {formulas.map((f) => (
                <div key={f.label}>
                  <div className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-label">{f.label}</div>
                  <BlockMath math={f.tex} />
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
