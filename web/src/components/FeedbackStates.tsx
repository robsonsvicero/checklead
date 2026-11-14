import React from 'react';

export const LoadingState: React.FC<{ mensagem?: string }> = ({ mensagem = 'Carregando dados...' }) => (
  <div className="state-container">
    <div className="spinner" />
    <p style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>{mensagem}</p>
  </div>
);

export const EmptyState: React.FC<{
  titulo?: string;
  mensagem: string;
  acao?: React.ReactNode;
}> = ({ titulo, mensagem, acao }) => (
  <div className="state-container">
    <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎯</div>
    {titulo && <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>{titulo}</h3>}
    <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', marginBottom: acao ? '18px' : '0' }}>
      {mensagem}
    </p>
    {acao}
  </div>
);

export const ErrorState: React.FC<{
  mensagem: string;
  detalhes?: string[];
  onTentarNovamente?: () => void;
}> = ({ mensagem, detalhes, onTentarNovamente }) => (
  <div className="state-container" style={{ borderColor: 'hsl(0 84% 60% / 0.3)', background: 'hsl(0 84% 60% / 0.08)' }}>
    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--destructive)', marginBottom: '4px' }}>
      Algo deu errado
    </h3>
    <p style={{ color: 'hsl(0 84% 75%)', fontSize: '13px', marginBottom: '12px' }}>{mensagem}</p>
    {detalhes && detalhes.length > 0 && (
      <ul style={{ textAlign: 'left', margin: '0 auto 14px', maxWidth: '350px', fontSize: '13px', color: 'var(--destructive)' }}>
        {detalhes.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    )}
    {onTentarNovamente && (
      <button className="btn-acao primary" onClick={onTentarNovamente}>
        Tentar novamente
      </button>
    )}
  </div>
);
