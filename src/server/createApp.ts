import express, { type Express } from 'express';
import path from 'path';
import { applyCors } from './middleware/cors.js';
import { securityHeadersMiddleware } from './config/security-headers.js';
import { registerApiRoutes } from './routes/index.js';
import { scheduleDailyAdminGate } from './services/admin-gate.service.js';
import { loadServerEnv } from './config/env.js';

/**
 * Build the Express application (API + SPA).
 * Kept separate from process listen() for testing and clarity.
 */
export async function createApp(): Promise<Express> {
  const env = loadServerEnv();
  const app = express();

  app.set('trust proxy', 1);
  applyCors(app);
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));
  app.use(securityHeadersMiddleware);

  registerApiRoutes(app);

  // Vite middleware in development; static build in production
  if (!env.isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API route not found', path: req.path });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  scheduleDailyAdminGate();
  return app;
}
