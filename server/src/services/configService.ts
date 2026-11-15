import { getDb } from '../db/connection.js';
import { Configuracao, ConfiguracaoDTO } from '@radar/shared';
import { getDatabaseProvider, getSupabaseClient, throwSupabaseError } from '../db/supabase.js';

export async function obterConfiguracao(userId: string): Promise<Configuracao> {
  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient()
      .from('configuracoes')
      .select('limite_sem_resposta_horas, limite_follow_up_dias, limite_lead_parado_dias')
      .eq('user_id', userId)
      .maybeSingle();
    throwSupabaseError(error);
    if (!data) return configuracaoPadrao();

    return {
      limite_sem_resposta_horas: Number(data.limite_sem_resposta_horas),
      limite_follow_up_dias: Number(data.limite_follow_up_dias),
      limite_lead_parado_dias: Number(data.limite_lead_parado_dias)
    };
  }

  const db = getDb();
  const conf = db.prepare('SELECT limite_sem_resposta_horas, limite_follow_up_dias, limite_lead_parado_dias FROM configuracoes WHERE id = 1').get() as Configuracao | undefined;

  if (!conf) {
    return configuracaoPadrao();
  }

  return {
    limite_sem_resposta_horas: Number(conf.limite_sem_resposta_horas),
    limite_follow_up_dias: Number(conf.limite_follow_up_dias),
    limite_lead_parado_dias: Number(conf.limite_lead_parado_dias)
  };
}

export async function atualizarConfiguracao(dados: ConfiguracaoDTO, userId: string): Promise<Configuracao> {
  if (getDatabaseProvider() === 'supabase') {
    const { error } = await getSupabaseClient()
      .from('configuracoes')
      .upsert({ user_id: userId, ...dados, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' });
    throwSupabaseError(error);
    return obterConfiguracao(userId);
  }

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

  return obterConfiguracao(userId);
}

function configuracaoPadrao(): Configuracao {
  return {
    limite_sem_resposta_horas: 24,
    limite_follow_up_dias: 3,
    limite_lead_parado_dias: 7
  };
}
