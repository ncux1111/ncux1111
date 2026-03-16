import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { bootstrapRouter } from './routes/bootstrap.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { migrationRouter } from './routes/migration.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { stateRouter } from './routes/state.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';
import { ensureStateRows } from './services/state.service.js';

const app = express();

app.set('trust proxy', env.trustProxy);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((item) => item.trim()),
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/api', healthRouter);
app.use('/api', publicRouter);
app.use('/api', authRouter);
app.use('/api', bootstrapRouter);
app.use('/api', stateRouter);
app.use('/api', uploadsRouter);
app.use('/api', migrationRouter);
app.use(errorHandler);

async function start() {
  await prisma.$connect();
  await ensureStateRows();

  const server = app.listen(env.PORT, () => {
    console.log(`zan-qdm-backend listening on ${env.PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
