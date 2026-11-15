import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getAuthenticatedUser, requireAuth } from '../middlewares/auth.js';
import { ConfiguracaoSchema } from '@radar/shared';
import { obterConfiguracao, atualizarConfiguracao } from '../services/configService.js';

export const configRouter = Router();

configRouter.use(requireAuth);

configRouter.get('/', asyncHandler(async (req, res) => {
  const config = await obterConfiguracao(getAuthenticatedUser(req).id);
  res.json(config);
}));

configRouter.put('/', asyncHandler(async (req, res) => {
  const body = ConfiguracaoSchema.parse(req.body);
  const atualizado = await atualizarConfiguracao(body, getAuthenticatedUser(req).id);
  res.json(atualizado);
}));
