const { getArtistDetails, getAlbumPopularity, getTrackPopularity } = require('../utils/spotifyApiHelpers'); // AGREGA getTrackPopularity
const supabase = require('../../supabaseClient');
const { updateArtistPopularity, updateAlbumPopularity, updateTrackPopularity } = require('../utils/supabaseHelpers');
const { buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion } = require('../utils/genreHelpers');

// Popularidad y foto de artistas
async function updateArtistsPopularityAndPhotosByIds(artistIds = []) {
  for (const id of artistIds) {
    try {
      const { data: artist } = await supabase
        .from('artistas')
        .select('spotify_id')
        .eq('id_artista', id)
        .single();
      if (!artist || !artist.spotify_id) continue;
      const details = await getArtistDetails(artist.spotify_id);
      if (details) {
        await updateArtistPopularity(id, details.popularity || 0);
        if (details.images.length > 0) {
          await supabase
            .from('artistas')
            .update({ foto_artista: details.images[0]?.url })
            .eq('id_artista', id);
        }
      }
    } catch (err) {
      console.error(`❌ Error en updateArtistsPopularityAndPhotosByIds para artista ${id}:`, err.message || err);
    }
  }
}

// Popularidad de álbumes
async function updateAlbumsPopularityByIds(albumIds = []) {
  for (const id of albumIds) {
    try {
      const { data: album } = await supabase
        .from('albumes')
        .select('spotify_id')
        .eq('id_album', id)
        .single();
      if (!album || !album.spotify_id) continue;
      const popularity = await getAlbumPopularity(album.spotify_id);
      await updateAlbumPopularity(id, popularity || 0);
    } catch (err) {
      console.error(`❌ Error en updateAlbumsPopularityByIds para álbum ${id}:`, err.message || err);
    }
  }
}

// Popularidad de canciones (ahora sí la actualiza desde Spotify)
async function updateTracksPopularityByIds(trackIds = []) {
  for (const id of trackIds) {
    try {
      const { data: song } = await supabase
        .from('canciones')
        .select('spotify_id')
        .eq('id_cancion', id)
        .single();
      if (!song || !song.spotify_id) continue;
      // Obtener popularidad desde Spotify
      const popularity = await getTrackPopularity(song.spotify_id);
      await updateTrackPopularity(id, popularity || 0);
    } catch (err) {
      console.error(`❌ Error en updateTracksPopularityByIds para canción ${id}:`, err.message || err);
    }
  }
}

// Géneros de artistas
async function updateArtistGenresByIds(artistIds = []) {
  for (const id of artistIds) {
    try {
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', id)
        .single();
      if (!artist) continue;
      await buscarGenerosDeArtista(id, artist.nombre_artista);
    } catch (err) {
      console.error(`❌ Error en updateArtistGenresByIds para artista ${id}:`, err.message || err);
    }
  }
}

// Géneros de álbumes
async function updateAlbumGenresByIds(albumIds = []) {
  for (const id of albumIds) {
    try {
      const { data: album } = await supabase
        .from('albumes')
        .select('titulo')
        .eq('id_album', id)
        .single();
      const { data: relArtista } = await supabase
        .from('album_artistas')
        .select('artista_id')
        .eq('album_id', id)
        .single();
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', relArtista?.artista_id)
        .single();
      if (album && artist) {
        await buscarGenerosDeAlbumOCancion('album', id, album.titulo, artist.nombre_artista);
      }
    } catch (err) {
      console.error(`❌ Error en updateAlbumGenresByIds para álbum ${id}:`, err.message || err);
    }
  }
}

// Géneros de canciones
async function updateSongGenresByIds(songIds = []) {
  for (const id of songIds) {
    try {
      const { data: song } = await supabase
        .from('canciones')
        .select('titulo')
        .eq('id_cancion', id)
        .single();
      const { data: relArtista } = await supabase
        .from('cancion_artistas')
        .select('artista_id')
        .eq('cancion_id', id)
        .single();
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', relArtista?.artista_id)
        .single();
      if (song && artist) {
        await buscarGenerosDeAlbumOCancion('cancion', id, song.titulo, artist.nombre_artista);
      }
    } catch (err) {
      console.error(`❌ Error en updateSongGenresByIds para canción ${id}:`, err.message || err);
    }
  }
}

module.exports = {
  updateArtistsPopularityAndPhotosByIds,
  updateAlbumsPopularityByIds,
  updateTracksPopularityByIds,
  updateArtistGenresByIds,
  updateAlbumGenresByIds,
  updateSongGenresByIds,
};