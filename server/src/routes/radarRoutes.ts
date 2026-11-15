import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getAuthenticatedUser, requireAuth } from '../middlewares/auth.js';
import { obterConfiguracao } from '../services/configService.js';
import { listarInteracoes, listarLeads } from '../services/leadService.js';
import {
  calcularAlertas,
  calcularMetricas,
  calcularMotivosPerda
} from '../services/radarService.js';
import type { Interacao } from '@radar/shared';
export const radarRouter = Router();

// Todas as rotas de radar exigem autenticação
radarRouter.use(requireAuth);

radarRouter.get('/alertas', asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUser(req).id;
  const [leads, interacoesLista, config] = await Promise.all([
    listarLeads({ ordenarPor: 'data', ordem: 'asc' }, userId),
    listarInteracoes(userId),
    obterConfiguracao(userId)
  ]);
  
  const interacoesPorLead = new Map<number, Interacao[]>();
  for (const it of interacoesLista) {
    const arr = interacoesPorLead.get(it.lead_id) || [];
    arr.push(it);
    interacoesPorLead.set(it.lead_id, arr);
  }

  const alertas = calcularAlertas(leads, interacoesPorLead, config);

  res.json(alertas);
}));

radarRouter.get('/metricas', asyncHandler(async (req, res) => {
  const leads = await listarLeads({}, getAuthenticatedUser(req).id);
  const metricas = calcularMetricas(leads);

  res.json(metricas);
}));

radarRouter.get('/motivos-perda', asyncHandler(async (req, res) => {
  const leads = await listarLeads({ status: 'perdido' }, getAuthenticatedUser(req).id);
  const motivos = calcularMotivosPerda(leads);

  res.json(motivos);
}));
