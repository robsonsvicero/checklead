import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
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

backupRouter.post('/import/csv', (req, res) => {
  try {
    const conteudo = typeof req.body === 'string' ? req.body : req.body?.csv;
    if (!conteudo || typeof conteudo !== 'string') {
      res.status(400).json({ error: 'Conteúdo da planilha CSV não informado ou inválido.' });
      return;
    }

    const resultado = importarPlanilhaCsv(conteudo);
    res.json({
      ok: true,
      message: `${resultado.totalImportados} leads importados com sucesso!${resultado.totalIgnorados > 0 ? ` (${resultado.totalIgnorados} linhas vazias ou sem nome/contato foram ignoradas)` : ''}`,
      ...resultado
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha ao processar planilha CSV' });
  }
});

backupRouter.get('/export/json', (req, res) => {
  const dados = gerarExportacaoJson();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=radar-leads-backup-${Date.now()}.json`);
  res.send(JSON.stringify(dados, null, 2));
});

backupRouter.get('/export/csv', (req, res) => {
  const csv = gerarExportacaoCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=radar-leads-${Date.now()}.csv`);
  res.send(csv);
});

backupRouter.post('/import/json', (req, res) => {
  try {
    const resultado = importarBackupJson(req.body);
    res.json({
      ok: true,
      message: `Backup restaurado com sucesso! ${resultado.totalLeads} leads e ${resultado.totalInteracoes} interações importadas.`,
      ...resultado
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Falha ao importar backup' });
  }
});
