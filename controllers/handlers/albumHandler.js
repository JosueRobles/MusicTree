const { getAlbumArtistsFromAPI } = require('../utils/spotifyHelpers'); // Helper para obtener artistas de álbums
const { getAllAlbumsFromDB, insertOrUpdateArtist, linkAlbumWithArtist } = require('../utils/supabaseHelpers'); // Función para vincular álbum y artista
const { getAlbumsFromArtist, getTracksFromAlbum } = require('../utils/spotifyHelpers');
const { insertOrUpdateAlbum, insertOrUpdateTrack } = require('../utils/supabaseHelpers');
const supabase = require('../../supabaseClient'); // Asegúrate de importar esto
const { importFullArtistCatalog } = require('../utils/spotifyHelpers');
const { notificarNuevosLanzamientos } = require('../utils/notifyHelpers');

const importFullArtistCatalogController = async (req, res) => {
  let { artistId } = req.params;
  let spotifyId = artistId;
  let id_artista = null;

  try {
    // Si el ID recibido NO es un Spotify ID (22 caracteres), búscalo en la BD
    if (!/^[a-zA-Z0-9]{22}$/.test(artistId)) {
      const { data, error } = await supabase
        .from('artistas')
        .select('spotify_id, id_artista')
        .eq('id_artista', artistId)
        .single();
      if (error || !data) {
        return res.status(404).send("Artista no encontrado en la base de datos.");
      }
      spotifyId = data.spotify_id;
      id_artista = data.id_artista;
    } else {
      // Si recibiste un Spotify ID, busca el id_artista en la BD
      const { data, error } = await supabase
        .from('artistas')
        .select('id_artista')
        .eq('spotify_id', artistId)
        .single();
      if (data) id_artista = data.id_artista;
    }

    if (!spotifyId) return res.status(400).send("No se pudo determinar el Spotify ID del artista.");

    await importFullArtistCatalog(spotifyId, id_artista);

    await notificarNuevosLanzamientos(
      artista_id,
      'album',
      nuevo_album_id,
      `¡Nuevo álbum añadido al catálogo de ${nombre_artista}!`
    );

    // Marca como principal en la BD
    if (id_artista) {
      await supabase
        .from('artistas')
        .update({ es_principal: true })
        .eq('id_artista', id_artista);
    }

    res.status(200).send(`Catálogo importado y artista marcado como principal.`);
  } catch (err) {
    console.error("Error al importar catálogo:", err);
    res.status(500).send("Error al importar catálogo.");
  }
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
