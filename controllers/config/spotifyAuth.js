const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: '56c01ae69dbb4a1590b32d41b0982840',
  clientSecret: '9168f79c417e4e898b83c3fec8c4dd19',
  redirectUri: 'http://localhost:5000/callback',
});

let accessToken = ''; 
let refreshToken = '';

async function initializeToken() {
  try {
    if (!accessToken) {
      console.warn("⚠️ Token de acceso no configurado. Debes autenticarte en /login.");
      return;
    }
    spotifyApi.setAccessToken(accessToken);
    if (refreshToken) {
      spotifyApi.setRefreshToken(refreshToken);
    }
  } catch (error) {
    console.error("❌ Error al inicializar el token de Spotify:", error.message || error);
  }
}

function setAccessToken(token) {
  accessToken = token;
  spotifyApi.setAccessToken(token);
}

function setTokens(newAccessToken, newRefreshToken) {
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;
  spotifyApi.setAccessToken(newAccessToken);
  spotifyApi.setRefreshToken(newRefreshToken);
}

function getSpotifyApi() {
  const token = spotifyApi.getAccessToken();
  if (!token) {
    throw new Error('Token de acceso no configurado.');
  }
  return spotifyApi;
}

async function generateClientCredentialsToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    const newAccessToken = data.body['access_token'];
    const expiresIn = data.body['expires_in'];

    setAccessToken(newAccessToken);
    console.log(`✅ Token obtenido por client credentials. Expira en ${expiresIn} segundos.`);
  } catch (err) {
    console.error('❌ Error al obtener token con client credentials:', err.message || err);
  }
}

module.exports = {
  spotifyApi,
  initializeToken,
  setAccessToken,
  setTokens,
  getSpotifyApi,
  generateClientCredentialsToken // <--- EXPORTA ESTO TAMBIÉN
};
