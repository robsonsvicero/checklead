import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb } from './db/connection.js';
import { runMigrations } from './db/migrations.js';
import { assertSupabaseSchemaReady, getDatabaseProvider } from './db/supabase.js';
import { authRouter } from './routes/authRoutes.js';
import { leadRouter } from './routes/leadRoutes.js';
import { radarRouter } from './routes/radarRoutes.js';
import { configRouter } from './routes/configRoutes.js';
import { backupRouter } from './routes/backupRoutes.js';
import { errorHandler } from './middlewares/error.js';
import { assertJwtSecretConfigured } from './services/authService.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares essenciais
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Rotas da API
app.use('/api/auth', authRouter);
app.use('/api/leads', leadRouter);
app.use('/api/radar', radarRouter);
app.use('/api/config', configRouter);
app.use('/api/backup', backupRouter);

// Servir frontend compilado em produção (se existir /web/dist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const possiveisCaminhosWebDist = [
  path.resolve(process.cwd(), 'web/dist'),
  path.resolve(process.cwd(), '../web/dist'),
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(__dirname, '../web/dist')
];

const webDistPath = possiveisCaminhosWebDist.find(p => fs.existsSync(p));
if (webDistPath) {
  console.log(`🌐 Servindo interface estática de: ${webDistPath}`);
  app.use(express.static(webDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
} else {
  console.log('ℹ️ Pasta web/dist não encontrada. A API está pronta para responder.');
}

// Handler de erros Zod e internos
app.use(errorHandler);

async function startServer(): Promise<void> {
  assertJwtSecretConfigured();

  if (getDatabaseProvider() === 'sqlite') {
    runMigrations(getDb());
  } else {
    await assertSupabaseSchemaReady();
  }

  app.listen(PORT, HOST, () => {
    console.log(`📡 Radar de Leads (Backend) rodando em http://${HOST}:${PORT}`);
    console.log(`💡 Para acessar via celular na mesma rede, use o IP local da máquina na porta ${PORT}`);
  });
}

void startServer().catch(error => {
  console.error('Falha ao iniciar o backend:', error);
  process.exitCode = 1;
});
