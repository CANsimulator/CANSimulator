import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { CookieProvider } from './context/CookieContext'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CookieProvider>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </CookieProvider>
    </ErrorBoundary>
  </StrictMode>,
)
