const { generateClientCredentialsToken, initializeToken } = require('../config/spotifyAuth');

async function safeSpotifyCall(fn) {
  let retries = 0;
  while (retries < 5) {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode === 429 && err.headers?.['retry-after']) {
        const wait = Number(err.headers['retry-after']) || 1;
        console.warn(`⏳ Rate limit alcanzado. Esperando ${wait} segundos...`);
        await new Promise(res => setTimeout(res, wait * 1000));
        retries++;
      } else if (err.statusCode === 401) {
        console.warn("🔄 Token de Spotify expirado. Intentando refrescar...");
        await generateClientCredentialsToken();
        await initializeToken();
        retries++;
      } else {
        console.error("❌ Spotify API error:", err.body?.error?.message || err.message || err);
        throw err;
      }
    }
  }
  throw new Error("Demasiados intentos fallidos con la API de Spotify.");
}

module.exports = { safeSpotifyCall };
