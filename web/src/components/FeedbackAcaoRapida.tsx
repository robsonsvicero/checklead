import React from 'react';

interface FeedbackAcaoRapidaProps {
  tipo: 'sucesso' | 'erro' | 'aviso';
  mensagem: string;
  acao?: {
    rotulo: string;
    executar: () => void;
    desabilitada?: boolean;
  };
}

export const FeedbackAcaoRapida: React.FC<FeedbackAcaoRapidaProps> = ({ tipo, mensagem, acao }) => (
  <div
    className={`radar-feedback ${tipo}`}
    role={tipo === 'erro' ? 'alert' : 'status'}
    aria-live={tipo === 'erro' ? 'assertive' : 'polite'}
    aria-atomic="true"
  >
    <span>{mensagem}</span>
    {acao && (
      <button className="btn-acao" onClick={acao.executar} disabled={acao.desabilitada}>
        {acao.rotulo}
      </button>
    )}
  </div>
);
