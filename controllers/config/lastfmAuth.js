const axios = require('axios');

const LASTFM_API_KEY = '44c38b909c9834631e6eab45b175506c';
const LASTFM_API_SECRET = 'faff6612d1f2424b0e1891e7be5f3146';
const lastFmApi = axios.create({
  baseURL: 'http://ws.audioscrobbler.com/2.0/',
  params: {
    api_key: LASTFM_API_KEY,
    api_secret: LASTFM_API_SECRET,  // Añadido el secret
    format: 'json',
  },
});

// Manejo de errores
lastFmApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response.status === 403) {
      console.error("❌ Acceso bloqueado por LastFM. Verifica tu clave de API o límites de uso.");
    }
    return Promise.reject(error);
  }
);

module.exports = lastFmApi;