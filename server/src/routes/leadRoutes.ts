import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
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

leadRouter.get('/', (req, res) => {
  const { status, origem, busca, ordenarPor, ordem } = req.query;

  const leads = listarLeads({
    status: typeof status === 'string' ? status : undefined,
    origem: typeof origem === 'string' ? origem : undefined,
    busca: typeof busca === 'string' ? busca : undefined,
    ordenarPor: ordenarPor === 'valor' ? 'valor' : 'data',
    ordem: ordem === 'asc' ? 'asc' : 'desc'
  });

  res.json(leads);
});

leadRouter.post('/', (req, res) => {
  const body = CriarLeadSchema.parse(req.body);
  const lead = criarLead(body);
  res.status(201).json(lead);
});

leadRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const lead = obterLeadPorId(id);
  if (!lead) {
    res.status(404).json({ error: 'Lead não encontrado' });
    return;
  }
  res.json(lead);
});

leadRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const body = AtualizarLeadSchema.parse(req.body);
  try {
    const lead = atualizarLead(id, body);
    res.json(lead);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao atualizar lead' });
  }
});

leadRouter.post('/:id/acoes', (req, res) => {
  const id = Number(req.params.id);
  const body = AcaoLeadSchema.parse(req.body);
  try {
    const lead = executarAcaoLead(id, body);
    res.json(lead);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao executar ação no lead' });
  }
});

leadRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const ok = excluirLead(id);
  if (!ok) {
    res.status(404).json({ error: 'Lead não encontrado' });
    return;
  }
  res.json({ ok: true });
});
