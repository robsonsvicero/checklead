import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { MotivoPerdaItem } from '@radar/shared';
import { formatarMoeda } from '../utils/formatters.js';
import { LoadingState, EmptyState, ErrorState } from '../components/FeedbackStates.js';

export const PerdasPage: React.FC = () => {
  const [motivos, setMotivos] = useState<MotivoPerdaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);
      const data = await apiFetch<MotivoPerdaItem[]>('/radar/motivos-perda');
      setMotivos(data);
    } catch (err: any) {
      setErro(err.message || 'Falha ao carregar motivos de perda');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const totalPerdidos = motivos.reduce((acc, m) => acc + m.quantidade, 0);
  const valorTotalPerdido = motivos.reduce((acc, m) => acc + m.valor_total, 0);

  return (
    <div className="container">
      <div className="page-heading">
        <h2 className="page-title">
          📉 Motivos de Perda
        </h2>
        <p className="page-subtitle">
          Entenda por que você não fechou e aprenda com cada oportunidade
        </p>
      </div>

      {carregando && <LoadingState mensagem="Calculando análise de perdas..." />}

      {erro && <ErrorState mensagem={erro} onTentarNovamente={carregarDados} />}

      {!carregando && !erro && motivos.length === 0 && (
        <EmptyState
          titulo="Nenhuma venda perdida registrada"
          mensagem="Quando você marcar um lead como 'Perdeu', os motivos serão tabulados automaticamente aqui."
        />
      )}

      {!carregando && !erro && motivos.length > 0 && (
        <div>
          {/* Card Resumo */}
          <div className="perdas-summary">
            <div>
              <div className="perdas-summary-label">TOTAL DE PERDAS</div>
              <div className="perdas-summary-value">
                {totalPerdidos}
              </div>
            </div>

            <div className="perdas-summary-divider" />

            <div>
              <div className="perdas-summary-label">VALOR TOTAL PERDIDO</div>
              <div className="perdas-summary-value">
                {formatarMoeda(valorTotalPerdido)}
              </div>
            </div>
          </div>

          <h3 className="perdas-ranking-title">
            Ranking dos Motivos Mais Frequentes
          </h3>

          {motivos.map((item, index) => (
            <div key={item.motivo} className="perda-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="perda-title">
                    #{index + 1} {item.motivo}
                  </span>
                  <div className="perda-meta">
                    {item.quantidade} {item.quantidade === 1 ? 'ocorrência' : 'ocorrências'} · {formatarMoeda(item.valor_total)} deixados na mesa
                  </div>
                </div>

                <div className="perda-percentual">
                  {item.percentual}%
                </div>
              </div>

              <div className="perda-barra-container">
                <div
                  className="perda-barra"
                  style={{ width: `${Math.min(100, Math.max(5, item.percentual))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
