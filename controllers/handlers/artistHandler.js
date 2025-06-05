const { searchArtistByName, saveArtistData, checkIfArtistExists } = require('../utils/spotifyHelpers');
const { insertOrUpdateArtist } = require('../utils/supabaseHelpers');

// Artistas principales conocidos
const mainArtistNames = [
  "Bad Bunny", "Taylor Swift", "Drake", "The Weeknd", "BTS", "Billie Eilish", "Ariana Grande", "Eminem",
  "Ed Sheeran", "Justin Bieber", "Rihanna", "Shakira", "Karol G", "Feid", "Dua Lipa", "Post Malone",
  "Olivia Rodrigo", "Harry Styles", "Rosalía", "Kendrick Lamar", "Travis Scott", "SZA", "Doja Cat", "Miley Cyrus"
];

const searchFamousArtists = async () => {
  for (const name of mainArtistNames) {
    console.log(`🎧 Buscando artista: ${name}`);
    const artistData = await searchArtistByName(name);

    if (artistData && artistData.id) {
      await saveArtistData(artistData, true); // true = artista coleccionable
      console.log(`✅ Artista guardado: ${name}`);
    } else {
      console.log(`❌ No se encontró info de: ${name}`);
    }
  }
};

const searchArtistsFromList = async (artistList) => {
  for (const name of artistList) {
    console.log(`🔍 Buscando artista de lista: ${name}`);
    const artistData = await searchArtistByName(name);

    if (artistData && artistData.id) {
      await saveArtistData(artistData, true);
      console.log(`🎉 Artista guardado desde lista: ${name}`);
    } else {
      console.log(`🚫 No encontrado en lista: ${name}`);
    }
  }
};

module.exports = {
  searchFamousArtists,
  searchArtistsFromList
};
