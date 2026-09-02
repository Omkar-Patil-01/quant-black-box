import { create } from 'zustand'

export type View = 'index' | 'bs' | 'heston' | 'bl' | 'mc' | 'apt'
export type MobilePanel = 'canvas' | 'params' | 'metrics'

interface AppState {
  view: View
  setView: (view: View) => void
  mobilePanel: MobilePanel
  setMobilePanel: (p: MobilePanel) => void
}

export const useApp = create<AppState>((set) => ({
  view: 'index',
  setView: (view) => set({ view }),
  mobilePanel: 'canvas',
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
}))
