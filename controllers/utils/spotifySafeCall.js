const { generateClientCredentialsToken, initializeToken } = require('../config/spotifyAuth');

// Máximo tiempo que estamos dispuestos a bloquear la petición HTTP (segundos)
const MAX_BLOCK_SECONDS = Number(process.env.MAX_BLOCK_SECONDS || 60);

async function safeSpotifyCall(fn) {
  let retries = 0;
  while (retries < 5) {
    try {
      return await fn();
    } catch (err) {
      if (err && err.statusCode === 429 && err.headers?.['retry-after']) {
        const wait = Number(err.headers['retry-after']) || 1;
        console.warn(`⏳ Rate limit alcanzado. Retry-after: ${wait}s`);
        // Si el wait es demasiado largo, no bloqueamos: devolvemos error al caller
        if (wait > MAX_BLOCK_SECONDS) {
          const e = new Error('RATE_LIMIT_LONG');
          e.code = 'RATE_LIMIT_LONG';
          e.retryAfter = wait;
          throw e;
        }
        await new Promise(res => setTimeout(res, wait * 1000));
        retries++;
      } else if (err && err.statusCode === 401) {
        console.warn("🔄 Token de Spotify expirado. Intentando refrescar...");
        await generateClientCredentialsToken();
        await initializeToken();
        retries++;
      } else {
        console.error("❌ Spotify API error:", err?.body?.error?.message || err?.message || err);
        throw err;
      }
    }
  }
  throw new Error("Demasiados intentos fallidos con la API de Spotify.");
}

module.exports = { safeSpotifyCall };
