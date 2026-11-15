import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getAuthenticatedUser, requireAuth } from '../middlewares/auth.js';
import {
  CriarLeadSchema,
  AtualizarLeadSchema,
  AcaoLeadSchema
} from '@radar/shared';
import {
  listarLeads,
  obterLeadPorId,
  criarLead,
  atualizarLead,
  executarAcaoLead,
  excluirLead
} from '../services/leadService.js';

export const leadRouter = Router();

leadRouter.use(requireAuth);

leadRouter.get('/', asyncHandler(async (req, res) => {
  const { status, origem, busca, ordenarPor, ordem } = req.query;
  const user = getAuthenticatedUser(req);

  const leads = await listarLeads({
    status: typeof status === 'string' ? status : undefined,
    origem: typeof origem === 'string' ? origem : undefined,
    busca: typeof busca === 'string' ? busca : undefined,
    ordenarPor: ordenarPor === 'valor' ? 'valor' : 'data',
    ordem: ordem === 'asc' ? 'asc' : 'desc'
  }, user.id);

  res.json(leads);
}));

leadRouter.post('/', asyncHandler(async (req, res) => {
  const body = CriarLeadSchema.parse(req.body);
  const lead = await criarLead(body, getAuthenticatedUser(req).id);
  res.status(201).json(lead);
}));

leadRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const lead = await obterLeadPorId(id, getAuthenticatedUser(req).id);
  if (!lead) {
    res.status(404).json({ error: 'Lead não encontrado' });
    return;
  }
  res.json(lead);
}));

leadRouter.patch('/:id', asyncHandler(async (req, res, next) => {
  const id = Number(req.params.id);
  const body = AtualizarLeadSchema.parse(req.body);
  try {
    const lead = await atualizarLead(id, body, getAuthenticatedUser(req).id);
    res.json(lead);
  } catch (err: any) {
    if (err.message === 'Lead não encontrado') {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}));

leadRouter.post('/:id/acoes', asyncHandler(async (req, res, next) => {
  const id = Number(req.params.id);
  const body = AcaoLeadSchema.parse(req.body);
  try {
    const lead = await executarAcaoLead(id, body, getAuthenticatedUser(req).id);
    res.json(lead);
  } catch (err: any) {
    if (err.message === 'Lead não encontrado') {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}));

leadRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const ok = await excluirLead(id, getAuthenticatedUser(req).id);
  if (!ok) {
    res.status(404).json({ error: 'Lead não encontrado' });
    return;
  }
  res.json({ ok: true });
}));
