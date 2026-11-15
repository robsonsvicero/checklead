import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getAuthenticatedUser, requireAuth } from '../middlewares/auth.js';
import {
  gerarExportacaoJson,
  gerarExportacaoCsv,
  importarBackupJson,
  gerarModeloCsvVazio,
  importarPlanilhaCsv
} from '../services/backupService.js';

export const backupRouter = Router();

backupRouter.use(requireAuth);

backupRouter.get('/modelo-csv', (req, res) => {
  const csv = gerarModeloCsvVazio();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=modelo-leads-radar.csv');
  res.send(csv);
});

backupRouter.post('/import/csv', asyncHandler(async (req, res) => {
  try {
    const conteudo = typeof req.body === 'string' ? req.body : req.body?.csv;
    if (!conteudo || typeof conteudo !== 'string') {
      res.status(400).json({ error: 'Conteúdo da planilha CSV não informado ou inválido.' });
      return;
    }

    const resultado = await importarPlanilhaCsv(conteudo, getAuthenticatedUser(req).id);
    res.json({
      ok: true,
      message: `${resultado.totalImportados} leads importados com sucesso!${resultado.totalIgnorados > 0 ? ` (${resultado.totalIgnorados} linhas vazias ou sem nome/contato foram ignoradas)` : ''}`,
      ...resultado
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha ao processar planilha CSV' });
  }
}));

backupRouter.get('/export/json', asyncHandler(async (req, res) => {
  const dados = await gerarExportacaoJson(getAuthenticatedUser(req).id);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=radar-leads-backup-${Date.now()}.json`);
  res.send(JSON.stringify(dados, null, 2));
}));

backupRouter.get('/export/csv', asyncHandler(async (req, res) => {
  const csv = await gerarExportacaoCsv(getAuthenticatedUser(req).id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=radar-leads-${Date.now()}.csv`);
  res.send(csv);
}));

backupRouter.post('/import/json', asyncHandler(async (req, res) => {
  try {
    const resultado = await importarBackupJson(req.body, getAuthenticatedUser(req).id);
    res.json({
      ok: true,
      message: `Backup restaurado com sucesso! ${resultado.totalLeads} leads e ${resultado.totalInteracoes} interações importadas.`,
      ...resultado
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha ao importar backup' });
  }
}));
