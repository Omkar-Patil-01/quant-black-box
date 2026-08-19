import { useEffect, useRef } from 'react'
import { useWorkspace, extractModelParams } from '../store/workspace'
import { getStorageProvider } from './storage'

export function useAutoSave() {
  const prev = useRef<string>('')

  useEffect(() => {
    const unsub = useWorkspace.subscribe(async (state) => {
      if (!state.activeModelId) return
      const params = await extractModelParams(state.activeModelId)
      const key = JSON.stringify(params)
      if (key === prev.current) return
      prev.current = key
      useWorkspace.setState({ lastModelParams: params })
      if (state.activeScenarioId) {
        state.saveToScenario(state.activeScenarioId, params)
      }
    })
    return unsub
  }, [])
}

export function useHydrate() {
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    ;(async () => {
      const provider = await getStorageProvider()
      const saved = await provider.load()
      if (saved) {
        useWorkspace.getState()._hydrate(saved)
        if (saved.activeModelId) {
          let params: Record<string, number | string | boolean> | null = null
          if (saved.activeScenarioId && saved.scenarios[saved.activeScenarioId]) {
            params = saved.scenarios[saved.activeScenarioId].parameters
          } else if (saved.lastModelParams) {
            params = saved.lastModelParams
          }
          if (params) {
            const { applyModelParams } = await import('../store/workspace')
            await applyModelParams(saved.activeModelId, params)
          }
        }
      }
    })()
  }, [])
}
