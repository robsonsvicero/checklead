import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { ConfiguracaoSchema } from '@radar/shared';
import { obterConfiguracao, atualizarConfiguracao } from '../services/configService.js';

export const configRouter = Router();

configRouter.use(requireAuth);

configRouter.get('/', (req, res) => {
  const config = obterConfiguracao();
  res.json(config);
});

configRouter.put('/', (req, res) => {
  const body = ConfiguracaoSchema.parse(req.body);
  const atualizado = atualizarConfiguracao(body);
  res.json(atualizado);
});
