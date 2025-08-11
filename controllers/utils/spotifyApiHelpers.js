const { safeSpotifyCall } = require('./spotifySafeCall');
const { getSpotifyApi } = require('../config/spotifyAuth');
// Obtener la foto y popularidad de un artista desde Spotify
async function getArtistDetails(spotifyId, spotifyApi) {
  try {
    const spotifyApi = getSpotifyApi();
    const data = await safeSpotifyCall(() => spotifyApi.getArtist(spotifyId));

    if (!data.body.name) {
      throw new Error(`El artista con ID ${spotifyId} no tiene un nombre válido.`);
    }

    return {
      name: data.body.name,
      popularity: data.body.popularity || 0,
      images: data.body.images || [],
    };
  } catch (err) {
    console.error(`Error al obtener detalles del artista ${spotifyId}:`, err.message || err);
    return null; // Devolver null si no se encuentran datos
  }
}

async function getAlbumPopularity(albumId) {
  try {
    const spotifyApi = getSpotifyApi();
    const data = await safeSpotifyCall(() => spotifyApi.getAlbum(albumId));
    return data.body.popularity || 0;
  } catch (err) {
    console.error(`Error al obtener popularidad del álbum ${albumId}:`, err);
    throw err;
  }
}

async function getArtistPopularity(artistId) {
  try {
    const spotifyApi = getSpotifyApi();
    const data = await safeSpotifyCall(() => spotifyApi.getArtist(artistId));
    return data.body.popularity || 0;
  } catch (err) {
    console.error(`Error al obtener popularidad del artista ${artistId}:`, err);
    throw err;
  }
}

async function getTrackPopularity(trackId) {
  try {
    const spotifyApi = getSpotifyApi();
    const data = await safeSpotifyCall(() => spotifyApi.getTrack(trackId));
    return data.body.popularity || 0;
  } catch (err) {
    console.error(`Error al obtener popularidad de la canción ${trackId}:`, err);
    return 0;
  }
}

module.exports = {
  getAlbumPopularity,
  getArtistPopularity,
  getArtistDetails,
  getTrackPopularity, // Exporta la nueva función
};