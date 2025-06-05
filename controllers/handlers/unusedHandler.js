const { deleteFromSupabase, extractPlaylistTracks } = require('../utils/supabaseHelpers');
const { getNewReleases, getPlaylistData } = require('../utils/spotifyHelpers');

const deleteArtistData = async (artistId) => {
  console.log(`⚠️ Eliminando datos del artista ID: ${artistId}`);
  await deleteFromSupabase(artistId);
  console.log(`🗑️ Datos eliminados para artista: ${artistId}`);
};

const searchNewReleases = async () => {
  console.log(`🆕 Buscando lanzamientos recientes...`);
  const releases = await getNewReleases();
  console.log(`🎉 Nuevos lanzamientos encontrados: ${releases.length}`);
};

const searchOneHitWonders = async () => {
  console.log(`🎯 Buscando artistas One Hit Wonder...`);
  // lógica pendiente
};

const extractSpotifyPlaylist = async (playlistId) => {
  console.log(`📥 Extrayendo playlist de Spotify: ${playlistId}`);
  const data = await getPlaylistData(playlistId);
  await extractPlaylistTracks(data);
};

module.exports = {
  deleteArtistData,
  searchNewReleases,
  searchOneHitWonders,
  extractSpotifyPlaylist
};
