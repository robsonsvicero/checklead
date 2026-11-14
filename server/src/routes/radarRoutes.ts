import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getDb } from '../db/connection.js';
import { obterConfiguracao } from '../services/configService.js';
import {
  calcularAlertas,
  calcularMetricas,
  calcularMotivosPerda
} from '../services/radarService.js';
import { Lead, Interacao } from '@radar/shared';

export const radarRouter = Router();

// Todas as rotas de radar exigem autenticação
radarRouter.use(requireAuth);

radarRouter.get('/alertas', (req, res) => {
  const db = getDb();
  const leads = db.prepare('SELECT * FROM leads ORDER BY id ASC').all() as unknown as Lead[];
  const interacoesLista = db.prepare('SELECT * FROM interacoes ORDER BY criado_em ASC').all() as unknown as Interacao[];
  
  const interacoesPorLead = new Map<number, Interacao[]>();
  for (const it of interacoesLista) {
    const arr = interacoesPorLead.get(it.lead_id) || [];
    arr.push(it);
    interacoesPorLead.set(it.lead_id, arr);
  }

  const config = obterConfiguracao();
  const alertas = calcularAlertas(leads, interacoesPorLead, config);

  res.json(alertas);
});

radarRouter.get('/metricas', (req, res) => {
  const db = getDb();
  const leads = db.prepare('SELECT * FROM leads').all() as unknown as Lead[];
  const metricas = calcularMetricas(leads);

  res.json(metricas);
});

radarRouter.get('/motivos-perda', (req, res) => {
  const db = getDb();
  const leads = db.prepare("SELECT * FROM leads WHERE status = 'perdido'").all() as unknown as Lead[];
  const motivos = calcularMotivosPerda(leads);

  res.json(motivos);
});
