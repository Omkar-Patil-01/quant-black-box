import { AnimatePresence, motion } from 'motion/react'
import { Check, Loader2 } from 'lucide-react'
import { useWorkspace } from '../store/workspace'

export default function SaveIndicator() {
  const status = useWorkspace((s) => s._saveStatus)

  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
        >
          {status === 'saving' ? (
            <Loader2 size={12} className="animate-spin text-label" />
          ) : (
            <Check size={12} className="text-green" />
          )}
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-label">
            {status === 'saving' ? 'Syncing...' : 'Saved to Local Workspace'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
