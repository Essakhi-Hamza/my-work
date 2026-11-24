import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthGate } from './backend/AuthGate'
import { BackendAuthProvider } from './backend/BackendAuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackendAuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </BackendAuthProvider>
  </StrictMode>,
)
