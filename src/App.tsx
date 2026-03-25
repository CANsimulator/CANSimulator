import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initVirtualNetwork } from './services/can/mockNodes';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { PowerProvider } from './context/PowerContext';
import { TestBenchProvider } from './context/TestBenchContext';
import { useScrollToTop } from './hooks/useScrollToTop';
import Header from './components/common/Header';
import Footer, { MinimalFooter } from './components/common/Footer';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const PhysicalPage = lazy(() => import('./pages/PhysicalPage'));
const GenerationsPage = lazy(() => import('./pages/GenerationsPage'));
const InspectorPage = lazy(() => import('./pages/InspectorPage'));
const SignalsPage = lazy(() => import('./pages/SignalsPage'));
const ArbitrationPage = lazy(() => import('./pages/ArbitrationPage'));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(m => ({ default: m.LegalPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));

import { useLocation, Outlet } from 'react-router-dom';
import { SimulatorStatusBar } from './components/common/SimulatorStatusBar';
import { MotionConfig } from 'framer-motion';

function AppLayout() {
  const { theme } = useTheme();
  const location = useLocation();
  useScrollToTop();

  useEffect(() => {
    initVirtualNetwork();
  }, []);

  const showStatusBar = [
    '/simulator', 
    '/arbitration', 
    '/physical', 
    '/errors', 
    '/generations', 
    '/inspector', 
    '/signals'
  ].includes(location.pathname);

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark bg-dark-950' : 'bg-light-50'} text-gray-900 dark:text-gray-100 selection:bg-cyber-blue/30 font-sans transition-colors duration-300`}>
      <ErrorBoundary>
        <div className="flex flex-col min-h-screen">
          <Header />
          {showStatusBar && (
            <div className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-4">
              <SimulatorStatusBar />
            </div>
          )}
          <main id="main-content" className="flex-1 flex flex-col">
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center bg-dark-950/50">
                <LoadingSpinner />
              </div>
            }>
              <Outlet />
            </Suspense>
          </main>
          {showStatusBar ? <MinimalFooter /> : <Footer />}
        </div>
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter basename="/CANSimulator">
        <PowerProvider>
          <TestBenchProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/simulator" element={<SimulatorPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/errors" element={<ErrorPage />} />
                <Route path="/physical" element={<PhysicalPage />} />
                <Route path="/generations" element={<GenerationsPage />} />
                <Route path="/inspector" element={<InspectorPage />} />
                <Route path="/signals" element={<SignalsPage />} />
                <Route path="/arbitration" element={<ArbitrationPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy-policy" element={<LegalPage title="Privacy Policy" />} />
                <Route path="/terms" element={<LegalPage title="Terms of Use" />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </TestBenchProvider>
        </PowerProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}

export default App;


