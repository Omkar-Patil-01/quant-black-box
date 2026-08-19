import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useApp } from './store/app'
import { useWorkspace } from './store/workspace'
import { useAutoSave } from './lib/workspaceHooks'
import { isModelId } from './types/workspace'
import SaveIndicator from './components/SaveIndicator'
import IndexPage from './pages/IndexPage'
import BlackScholesPage from './pages/BlackScholesPage'
import HestonPage from './pages/HestonPage'
import BlackLittermanPage from './pages/BlackLittermanPage'
import MonteCarloPage from './pages/MonteCarloPage'
import AptPage from './pages/AptPage'

export default function App() {
  const view = useApp((s) => s.view)
  const setActiveModel = useWorkspace((s) => s.setActiveModel)

  useAutoSave()

  useEffect(() => {
    if (isModelId(view)) {
      setActiveModel(view)
    }
  }, [view, setActiveModel])

  let page: ReactNode
  if (view === 'index') page = <IndexPage />
  else if (view === 'bs') page = <BlackScholesPage />
  else if (view === 'heston') page = <HestonPage />
  else if (view === 'bl') page = <BlackLittermanPage />
  else if (view === 'mc') page = <MonteCarloPage />
  else page = <AptPage />

  return (
    <>
      <SaveIndicator />
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          {page}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
