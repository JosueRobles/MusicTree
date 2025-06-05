const supabase = require('../../supabaseClient'); // Importar la instancia de Supabase
const { initializeToken, getSpotifyApi } = require('../config/spotifyAuth');
const { 
  trackExistsInDB, 
  insertOrUpdateTrack, 
  insertOrUpdateAlbum, 
  insertOrUpdateArtist, 
  addTrackToCollection, 
  createOrGetCollection 
} = require('../utils/supabaseHelpers');
const { syncAlbumArtists, getPlaylistTracks } = require('../utils/spotifyHelpers');

const BILLION_PLAYLIST_ID = '27BVkGBP3R25tkUvwExjcL';

const extractBillionPlaylist = async () => {
  try {
    await initializeToken(); // Asegura que el token esté configurado
    const spotifyApi = getSpotifyApi();

    console.log("Extrayendo canciones de Billion Club...");
    const tracks = await getPlaylistTracks(spotifyApi, BILLION_PLAYLIST_ID);

    // Crear o obtener la colección
    const collectionId = await createOrGetCollection();

    for (const item of tracks) {
      const track = item.track;
      if (!track || !track.id) continue;

      console.log(`🔍 Procesando track: ${track.name}`);
      
      // Validar si el álbum existe y tiene un ID válido
      if (!track.album || !track.album.id) {
        console.warn(`⚠️ El track ${track.name} no tiene un álbum válido asociado.`);
        continue; // Saltar al siguiente track
      }

      console.log(`📀 Álbum detectado: ${track.album.name}, ID: ${track.album.id}`);

      // Insertar o actualizar el álbum y obtener su ID interno y spotify_id
      const albumData = await insertOrUpdateAlbum(track.album);
      const albumId = albumData.id_album; // ID interno del álbum
      const albumSpotifyId = albumData.spotify_id; // spotify_id del álbum

      console.log(`✅ Álbum procesado: ${track.album.name} (spotify_id: ${albumSpotifyId})`);

      // Insertar o actualizar los artistas y registrar relaciones con el álbum
      const artistIds = [];
      for (const artist of track.artists) {
        const artistId = await insertOrUpdateArtist(artist);
        artistIds.push(artistId);
      }

      // Usar el spotify_id del álbum para sincronizar álbum-artistas
      if (albumSpotifyId) {
        await syncAlbumArtists(albumSpotifyId);
      } else {
        console.error(`❌ No se pudo sincronizar álbum-artistas para el álbum ${track.album.name} porque el spotify_id es undefined.`);
      }

      // Insertar o actualizar la canción usando el ID interno del álbum
      const trackId = await insertOrUpdateTrack(track, albumId);

      // Relacionar canción con artistas
      for (const artistId of artistIds) {
        await supabase.from('cancion_artistas').upsert({
          cancion_id: trackId,
          artista_id: artistId,
        }, { onConflict: ['cancion_id', 'artista_id'] });
      }

      // Añadir la canción a la colección
      await addTrackToCollection(trackId, collectionId);

      console.log(`✅ Canción procesada: ${track.name} (ID: ${trackId})`);
    }

    console.log("✅ Playlist procesada con éxito.");
  } catch (error) {
    console.error(`❌ Error al procesar la playlist:`, error.message || error);
  }
};

module.exports = {
  extractBillionPlaylist
};