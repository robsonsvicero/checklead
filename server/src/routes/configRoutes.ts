import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { requireAuth } from '../middlewares/auth.js';
import { ConfiguracaoSchema } from '@radar/shared';
import { obterConfiguracao, atualizarConfiguracao } from '../services/configService.js';

export const configRouter = Router();

configRouter.use(requireAuth);

configRouter.get('/', asyncHandler(async (_req, res) => {
  const config = await obterConfiguracao();
  res.json(config);
}));

configRouter.put('/', asyncHandler(async (req, res) => {
  const body = ConfiguracaoSchema.parse(req.body);
  const atualizado = await atualizarConfiguracao(body);
  res.json(atualizado);
}));
