import { create } from 'zustand'

export type View = 'index' | 'bs' | 'heston' | 'bl' | 'mc' | 'apt'

interface AppState {
  view: View
  setView: (view: View) => void
}

export const useApp = create<AppState>((set) => ({
  view: 'index',
  setView: (view) => set({ view }),
}))
