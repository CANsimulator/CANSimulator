import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initVirtualNetwork } from './services/can/mockNodes';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { PowerProvider } from './context/PowerContext';
import { useScrollToTop } from './hooks/useScrollToTop';
import Header from './components/common/Header';
import Footer from './components/common/Footer';

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

function AppLayout() {
  const { theme } = useTheme();
  useScrollToTop();

  useEffect(() => {
    initVirtualNetwork();
  }, []);

  const withLayout = (Component: React.ElementType) => (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main id="main-content" className="flex-1">
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center bg-dark-950/50">
            <LoadingSpinner />
          </div>
        }>
          <Component />
        </Suspense>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark bg-dark-950' : 'bg-light-50'} text-gray-900 dark:text-gray-100 selection:bg-cyber-blue/30 font-sans transition-colors duration-300`}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={withLayout(LandingPage)} />
          <Route path="/simulator" element={withLayout(SimulatorPage)} />
          <Route path="/pricing" element={withLayout(PricingPage)} />
          <Route path="/contact" element={withLayout(ContactPage)} />
          <Route path="/errors" element={withLayout(ErrorPage)} />
          <Route path="/physical" element={withLayout(PhysicalPage)} />
          <Route path="/generations" element={withLayout(GenerationsPage)} />
          <Route path="/inspector" element={withLayout(InspectorPage)} />
          <Route path="/signals" element={withLayout(SignalsPage)} />
          <Route path="/arbitration" element={withLayout(ArbitrationPage)} />
          <Route path="/auth" element={withLayout(AuthPage)} />
          <Route path="/about" element={withLayout(AboutPage)} />
          <Route path="/privacy-policy" element={withLayout(() => <LegalPage title="Privacy Policy" />)} />
          <Route path="/terms" element={withLayout(() => <LegalPage title="Terms of Use" />)} />
          <Route path="*" element={withLayout(() => <NotFoundPage />)} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename="/CANSimulator">
      <PowerProvider>
        <AppLayout />
      </PowerProvider>
    </BrowserRouter>
  );
}

export default App;


