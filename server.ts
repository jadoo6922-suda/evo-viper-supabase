/**
 * EVO VIPER — process entrypoint (bootstrap only).
 * Application wiring lives under src/server/.
 */
import { createApp } from './src/server/createApp.js';
export { computeRealHmac } from './src/server/services/hmac.service.js';

async function startServer() {
  const port = Number(process.env.PORT || 3000);
  const app = await createApp();
  app.listen(port, '0.0.0.0', () => {
    console.log(`[FullStack] Express server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
