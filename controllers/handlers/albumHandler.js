const { getAlbumArtistsFromAPI } = require('../utils/spotifyHelpers'); // Helper para obtener artistas de álbums
const { getAllAlbumsFromDB, insertOrUpdateArtist, linkAlbumWithArtist } = require('../utils/supabaseHelpers'); // Función para vincular álbum y artista

const importFullArtistCatalog = async (artistId) => {
  console.log(`📀 Importando catálogo para artista ID: ${artistId}`);
  const albums = await getArtistAlbums(artistId);

  for (const album of albums) {
    await insertOrUpdateAlbum(album, artistId);
    const tracks = await getAlbumTracks(album.id);

    for (const track of tracks) {
      await insertOrUpdateTrack(track, album.id);
    }
  }
  console.log(`✅ Catálogo completo importado para artista: ${artistId}`);
};

const searchArtistsFromAlbums = async () => {
  console.log("🔍 Buscando artistas de los álbumes en la base de datos...");

  // Obtener todos los álbumes desde la base de datos
  const albums = await getAllAlbumsFromDB();

  for (const album of albums) {
    console.log(`📀 Procesando álbum: ${album.titulo} (spotify_id: ${album.spotify_id})`);

    // Obtener los artistas del álbum desde la API de Spotify
    const albumArtists = await getAlbumArtistsFromAPI(album.spotify_id);

    if (!albumArtists || albumArtists.length === 0) {
      console.warn(`⚠️ No se encontraron artistas para el álbum: ${album.titulo}`);
      continue;
    }

    // Insertar o actualizar los artistas en la base de datos y vincularlos con el álbum
    for (const artist of albumArtists) {
      const artistId = await insertOrUpdateArtist(artist); // Inserta el artista si no existe
      await linkAlbumWithArtist(album.id_album, artistId); // Vincula el álbum con el artista
    }

    console.log(`✅ Artistas del álbum "${album.titulo}" procesados y vinculados.`);
  }

  console.log("🎉 Búsqueda y vinculación de artistas de álbumes completada.");
};

module.exports = {
  importFullArtistCatalog,
  searchArtistsFromAlbums, // Nuevo método exportado
};
