import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { CookieProvider } from './context/CookieContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/ToastContainer'
import { ErrorBoundary } from './components/ErrorBoundary'

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  // TODO: reportError(event.reason) — integrate Sentry or similar here
  event.preventDefault(); // prevents default browser console warning format
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CookieProvider>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <ToastContainer />
              <App />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </CookieProvider>
    </ErrorBoundary>
  </StrictMode>,
)
