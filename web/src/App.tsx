import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
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
  const { authenticated, hasUser, loading } = useAuth();
  const [totalAlertas, setTotalAlertas] = useState(0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState mensagem="Iniciando Radar de Leads..." />
      </div>
    );
  }

  if (!hasUser) {
    return <Navigate to="/setup" replace />;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
