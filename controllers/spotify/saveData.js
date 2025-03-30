const supabase = require('../../db');
const searchArtists = require('./searchArtists');
const getArtistAlbums = require('./getArtistAlbums');
const getAlbumTracks = require('./getAlbumTracks');
const getSpotifyToken = require('./getSpotifyToken');

const saveData = async (query) => {
  try {
    const token = await getSpotifyToken();

    // Obtener artistas con más de 40M de oyentes
    const artists = await searchArtists(query, token);
    const filteredArtists = artists.filter(artist => artist.followers.total >= 40000000);

    console.log(`Encontrados ${filteredArtists.length} artistas con más de 40M de oyentes para la búsqueda: ${query}`);

    for (const artist of filteredArtists) {
      const savedArtist = await saveArtist(artist);
      if (!savedArtist) continue;

      const albums = await getArtistAlbums(artist.id, token);
      console.log(`Encontrados ${albums.length} álbumes para ${artist.name}`);

      await supabase
        .from('artistas')
        .update({ numero_albumes: albums.length })
        .eq('id_artista', savedArtist.id_artista);

      let totalCanciones = 0;

      for (const album of albums) {
        const savedAlbum = await saveAlbum(album, savedArtist.id_artista, token);
        if (!savedAlbum) continue;

        const tracks = await getAlbumTracks(album.id, token);
        console.log(`Encontradas ${tracks.length} canciones para el álbum: ${album.name}`);

        await supabase
          .from('albumes')
          .update({ numero_canciones: tracks.length })
          .eq('id_album', savedAlbum.id_album);

        totalCanciones += tracks.length;

        for (const track of tracks) {
          const savedTrack = await saveTrack(track, savedAlbum.id_album);
          if (savedTrack) {
            await linkTrackArtists(savedTrack.id_cancion, track.artists);
          }
        }
      }

      await supabase
        .from('artistas')
        .update({ numero_canciones: totalCanciones })
        .eq('id_artista', savedArtist.id_artista);
    }

    console.log('Datos almacenados correctamente');
  } catch (error) {
    console.error('Error al guardar datos:', error);
  }
};

const saveArtist = async (artist) => {
  console.log("Procesando artista:", artist);
  if (!artist || !artist.id || !artist.name) {
    console.error("Artista no válido:", artist);
    return null;
  }

  const artistData = {
    spotify_id: artist.id,
    nombre_artista: artist.name,
    biografia: '',
    foto_artista: artist.images?.[0]?.url || '',
    popularidad_artista: artist.popularity || 0,
    numero_albumes: null,
    numero_canciones: null,
  };

  const { data: insertedArtist, error: artistError } = await supabase
    .from('artistas')
    .upsert(artistData)
    .select();

  if (artistError) {
    console.error('Error al insertar artista:', artistError);
    return null;
  }

  return insertedArtist[0];
};

const saveAlbum = async (album, artistId, token) => {
  const { data: existingAlbum } = await supabase
    .from('albumes')
    .select('*')
    .eq('spotify_id', album.id)
    .single();

  if (existingAlbum) {
    return existingAlbum;
  }

  const tracks = await getAlbumTracks(album.id, token);
  const popularidadAlbum = tracks.length > 0
    ? tracks.reduce((sum, track) => sum + (track.popularity || 0), 0) / tracks.length
    : 0;

  const albumData = {
    spotify_id: album.id,
    titulo: album.name,
    anio: new Date(album.release_date).getFullYear(),
    foto_album: album.images?.[0]?.url || '',
    numero_canciones: album.total_tracks || 0,
    tipo_album: album.album_type || 'album',
    popularidad_album: popularidadAlbum,
  };

  const { data: insertedAlbum, error: albumError } = await supabase
    .from('albumes')
    .upsert(albumData)
    .select();

  if (albumError) {
    console.error('Error al insertar álbum:', albumError);
    return null;
  }

  await supabase
    .from('album_artistas')
    .upsert({ album_id: insertedAlbum[0].id_album, artista_id: artistId });

  return insertedAlbum[0];
};

const saveTrack = async (track, albumId) => {
  const { data: existingTrack } = await supabase
    .from('canciones')
    .select('*')
    .eq('spotify_id', track.id)
    .single();

  if (existingTrack) {
    return existingTrack;
  }

  const trackData = {
    spotify_id: track.id,
    titulo: track.name,
    album: albumId,
    orden: track.track_number,
    duracion_ms: track.duration_ms,
    popularidad: track.popularity || 0,
    categoria: 'normal',
  };

  const { data: insertedTrack, error: trackError } = await supabase
    .from('canciones')
    .upsert(trackData)
    .select();

  if (trackError) {
    console.error('Error al insertar canción:', trackError);
    return null;
  }

  return insertedTrack[0];
};

const linkTrackArtists = async (trackId, artists) => {
  for (const artist of artists) {
    const savedArtist = await saveArtist(artist);
    if (savedArtist) {
      await supabase
        .from('cancion_artistas')
        .upsert({ 
          cancion_id: trackId, 
          artista_id: savedArtist.id_artista 
        });
    }
  }
};

module.exports = saveData;