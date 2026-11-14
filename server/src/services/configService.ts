import { getDb } from '../db/connection.js';
import { Configuracao, ConfiguracaoDTO } from '@radar/shared';

export function obterConfiguracao(): Configuracao {
  const db = getDb();
  const conf = db.prepare('SELECT limite_sem_resposta_horas, limite_follow_up_dias, limite_lead_parado_dias FROM configuracoes WHERE id = 1').get() as Configuracao | undefined;

  if (!conf) {
    return {
      limite_sem_resposta_horas: 24,
      limite_follow_up_dias: 3,
      limite_lead_parado_dias: 7
    };
  }

  return {
    limite_sem_resposta_horas: Number(conf.limite_sem_resposta_horas),
    limite_follow_up_dias: Number(conf.limite_follow_up_dias),
    limite_lead_parado_dias: Number(conf.limite_lead_parado_dias)
  };
}

export function atualizarConfiguracao(dados: ConfiguracaoDTO): Configuracao {
  const db = getDb();
  const agora = new Date().toISOString();

  db.prepare(`
    UPDATE configuracoes 
    SET limite_sem_resposta_horas = ?,
        limite_follow_up_dias = ?,
        limite_lead_parado_dias = ?,
        atualizado_em = ?
    WHERE id = 1
  `).run(
    dados.limite_sem_resposta_horas,
    dados.limite_follow_up_dias,
    dados.limite_lead_parado_dias,
    agora
  );

  return obterConfiguracao();
}
