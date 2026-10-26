import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Without this, any uncaught render error unmounts the entire React tree and
 * the screen goes blank. Contain it to a readable, recoverable card instead.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-label">Something broke</div>
        <div className="max-w-md break-words font-mono text-[11px] text-red">{error.message}</div>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="cursor-pointer rounded border border-border px-3 py-1.5 font-mono text-[9px] text-label hover:border-[#555] hover:text-white"
        >
          Try to recover
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer rounded bg-white px-3 py-1.5 font-mono text-[9px] font-semibold text-black"
        >
          Reload app
        </button>
      </div>
    )
  }
}
