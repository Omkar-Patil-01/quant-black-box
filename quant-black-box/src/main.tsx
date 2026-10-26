import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { useHydrate } from './lib/workspaceHooks'

function Root() {
  useHydrate()
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
