import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { Header } from './components/Header.js';
import { BottomNav } from './components/BottomNav.js';
import { LoadingState } from './components/FeedbackStates.js';
import { SetupPage } from './pages/SetupPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RadarPage } from './pages/RadarPage.js';
import { LeadsPage } from './pages/LeadsPage.js';
import { LeadDetalhesPage } from './pages/LeadDetalhesPage.js';
import { PerdasPage } from './pages/PerdasPage.js';
import { ConfigPage } from './pages/ConfigPage.js';

const ProtectedLayout: React.FC = () => {
  const { authenticated, hasUser, provider, loading } = useAuth();
  const location = useLocation();
  const [totalAlertas, setTotalAlertas] = useState(0);
  const callbackHash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const callbackSearch = new URLSearchParams(location.search);
  const hasEmailAction = ['invite', 'recovery'].includes(
    callbackHash.get('type') || callbackSearch.get('type') || ''
  ) || ['error', 'error_code', 'error_description'].some(key =>
    callbackHash.has(key) || callbackSearch.has(key)
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState mensagem="Iniciando CheckLeads..." />
      </div>
    );
  }

  if (hasEmailAction) {
    return <Navigate
      to={{ pathname: '/login', search: location.search, hash: location.hash }}
      replace
    />;
  }

  if (provider === 'sqlite' && !hasUser) {
    return <Navigate to="/setup" replace />;
  }

  if (!authenticated) {
    return <Navigate
      to={{ pathname: '/login', search: location.search, hash: location.hash }}
      replace
    />;
  }

  return (
    <>
      <Header totalAlertas={totalAlertas} />
      <main style={{ minHeight: 'calc(100vh - 140px)' }}>
        <Routes>
          <Route path="/" element={<RadarPage onAtualizarAlertasTotal={setTotalAlertas} />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetalhesPage />} />
          <Route path="/perdas" element={<PerdasPage />} />
          <Route path="/configuracoes" element={<ConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav totalAlertas={totalAlertas} />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
