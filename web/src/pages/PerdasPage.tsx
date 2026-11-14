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
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)' }}>
          📉 Motivos de Perda
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
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
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-around',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>TOTAL DE PERDAS</div>
              <div style={{ fontSize: '26px', fontWeight: 750, color: 'var(--hot)', marginTop: '4px' }}>
                {totalPerdidos}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border)' }} />

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>VALOR TOTAL PERDIDO</div>
              <div style={{ fontSize: '26px', fontWeight: 750, color: 'var(--hot)', marginTop: '4px' }}>
                {formatarMoeda(valorTotalPerdido)}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
            Ranking dos Motivos Mais Frequentes
          </h3>

          {motivos.map((item, index) => (
            <div key={item.motivo} className="perda-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '15px' }}>
                    #{index + 1} {item.motivo}
                  </span>
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                    {item.quantidade} {item.quantidade === 1 ? 'ocorrência' : 'ocorrências'} · {formatarMoeda(item.valor_total)} deixados na mesa
                  </div>
                </div>

                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--hot)' }}>
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
