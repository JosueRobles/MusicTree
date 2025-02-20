const supabase = require('../../db');
const searchArtists = require('./searchArtists');
const getArtistAlbums = require('./getArtistAlbums');
const getAlbumTracks = require('./getAlbumTracks');

const clearDatabase = async () => {
  await supabase.from('cancion_artistas').delete().neq('id', 0);
  await supabase.from('album_artistas').delete().neq('id', 0);
  await supabase.from('canciones').delete().neq('id', 0);
  await supabase.from('albumes').delete().neq('id', 0);
  await supabase.from('artistas').delete().neq('id', 0);
};

const saveArtist = async (artist) => {
  const artistData = {
    spotify_id: artist.id,
    nombre_artista: artist.name,
    biografia: artist.biography || '',
    foto_artista: artist.images?.[0]?.url || '',
    popularidad_artista: artist.popularity || 0,
    numero_albumes: 0,
    numero_canciones: 0,
  };

  const { data: insertedArtist, error: artistError } = await supabase
    .from('artistas')
    .upsert(artistData)
    .select();

  if (artistError || !insertedArtist || insertedArtist.length === 0) {
    if (artistError.code === '23505') {
      // Ignorar errores de duplicado
      return await supabase
        .from('artistas')
        .select('*')
        .eq('spotify_id', artist.id)
        .single();
    } else {
      console.error('Error al insertar o actualizar artista:', artistError);
      return null;
    }
  }

  return insertedArtist[0];
};

const saveAlbum = async (album, artistId) => {
  const albumData = {
    spotify_id: album.id,
    titulo: album.name,
    anio: new Date(album.release_date).getFullYear(),
    foto_album: album.images?.[0]?.url || '',
    numero_canciones: album.total_tracks,
    tipo_album: album.album_type,
    popularidad_album: album.popularity || 0,
  };

  const { data: insertedAlbum, error: albumError } = await supabase
    .from('albumes')
    .upsert(albumData)
    .select();

  if (albumError || !insertedAlbum || insertedAlbum.length === 0) {
    if (albumError.code === '23505') {
      // Ignorar errores de duplicado
      return await supabase
        .from('albumes')
        .select('*')
        .eq('spotify_id', album.id)
        .single();
    } else {
      console.error('Error al insertar o actualizar álbum:', albumError);
      return null;
    }
  }

  await supabase
    .from('album_artistas')
    .upsert({ album_id: insertedAlbum[0].id_album, artista_id: artistId });

  return insertedAlbum[0];
};

const saveTrack = async (track, albumId) => {
  const trackData = {
    spotify_id: track.id,
    titulo: track.name,
    album: albumId,
    orden: track.track_number,
    duracion_ms: track.duration_ms,
    popularidad: track.popularity || 0,
    preview_url: track.preview_url || '',
  };

  const { data: insertedTrack, error: trackError } = await supabase
    .from('canciones')
    .upsert(trackData)
    .select();

  if (trackError || !insertedTrack || insertedTrack.length === 0) {
    if (trackError.code === '23505') {
      // Ignorar errores de duplicado
      return await supabase
        .from('canciones')
        .select('*')
        .eq('spotify_id', track.id)
        .single();
    } else {
      console.error('Error al insertar o actualizar canción:', trackError);
      return null;
    }
  }

  return insertedTrack[0];
};

const linkTrackArtists = async (trackId, artists) => {
  for (const artist of artists) {
    const savedArtist = await saveArtist(artist);
    if (savedArtist) {
      await supabase
        .from('cancion_artistas')
        .upsert({ cancion_id: trackId, artista_id: savedArtist.id_artista });
    }
  }
};

const saveData = async (query) => {
  await clearDatabase();

  const artists = await searchArtists(query);

  for (const artist of artists) {
    const savedArtist = await saveArtist(artist);
    if (!savedArtist) continue;

    const albums = await getArtistAlbums(artist.id);

    for (const album of albums) {
      const savedAlbum = await saveAlbum(album, savedArtist.id_artista);
      if (!savedAlbum) continue;

      const tracks = await getAlbumTracks(album.id);

      for (const track of tracks) {
        const savedTrack = await saveTrack(track, savedAlbum.id_album);
        if (savedTrack) {
          await linkTrackArtists(savedTrack.id_cancion, track.artists);
        }
      }
    }
  }

  console.log('Datos de artistas, álbumes y canciones almacenados correctamente');
};

module.exports = saveData;