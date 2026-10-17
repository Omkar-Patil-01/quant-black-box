import { env } from './config.js';
import app from './app.js';

// Local entry point. On Vercel, api/index.ts exports the same app instead.
app.listen(env.PORT, () => {
  console.log(`[Quant Black Box] Running on http://localhost:${env.PORT}`);
  console.log(`[Quant Black Box] Environment: ${env.NODE_ENV}`);
});
