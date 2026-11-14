import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface HeaderProps {
  totalAlertas?: number;
}

export const Header: React.FC<HeaderProps> = ({ totalAlertas = 0 }) => {
  const { authenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair do Radar?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="header-brand" aria-label="CheckLead">
          <span className="brand-mark">
            <span className="pulse-ring"></span>
            <img src="/favicon.svg" alt="CheckLead" />
          </span>
          <span>
            <span className="brand-title">CheckLead</span>
            <span className="brand-subtitle">Detector de Vazamento</span>
          </span>
          {totalAlertas > 0 && (
            <span className="header-badge" style={{ marginLeft: '6px' }} title={`${totalAlertas} alertas de vazamento ativos`}>
              ● {totalAlertas} vazando
            </span>
          )}
        </Link>

        {authenticated && (
          <div className="header-actions">
            <nav className="desktop-nav">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Radar</NavLink>
              <NavLink to="/leads" className={({ isActive }) => isActive ? 'active' : ''}>Leads</NavLink>
              <NavLink to="/perdas" className={({ isActive }) => isActive ? 'active' : ''}>Perdas</NavLink>
              <NavLink to="/configuracoes" className={({ isActive }) => isActive ? 'active' : ''}>Ajustes</NavLink>
            </nav>

            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              title="Sair do sistema"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
