const { getRelatedArtists, saveArtistData } = require('../utils/spotifyHelpers');

const updateArtistRelated = async (artistId) => {
  console.log(`🔗 Buscando artistas relacionados con: ${artistId}`);
  const related = await getRelatedArtists(artistId);

  for (const artist of related) {
    await saveArtistData(artist, false); // false = colaborador
  }

  console.log(`🔄 Artistas relacionados importados para: ${artistId}`);
};

module.exports = {
  updateArtistRelated
};
