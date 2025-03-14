// Actualización de saveData.js para solucionar problemas de población de datos
const supabase = require('../../db');
const searchArtists = require('./searchArtists');
const getArtistAlbums = require('./getArtistAlbums');
const getAlbumTracks = require('./getAlbumTracks');

const saveData = async (query) => {
  try {
    // No borrar datos existentes para evitar pérdida de información
    // Obtenemos los artistas según el criterio de búsqueda
    const artists = await searchArtists(query);
    
    console.log(`Encontrados ${artists.length} artistas para la búsqueda: ${query}`);
    
    for (const artist of artists) {
      // Guardar artista
      const savedArtist = await saveArtist(artist);
      if (!savedArtist) continue;
      
      // Obtener álbumes del artista
      const albums = await getArtistAlbums(artist.id);
      console.log(`Encontrados ${albums.length} álbumes para el artista: ${artist.name}`);
      
      // Actualizar contador de álbumes en el artista
      await supabase
        .from('artistas')
        .update({ numero_albumes: albums.length })
        .eq('id_artista', savedArtist.id_artista);
      
      let totalCanciones = 0;
      
      for (const album of albums) {
        // Guardar álbum
        const savedAlbum = await saveAlbum(album, savedArtist.id_artista);
        if (!savedAlbum) continue;
        
        // Obtener canciones del álbum
        const tracks = await getAlbumTracks(album.id);
        console.log(`Encontradas ${tracks.length} canciones para el álbum: ${album.name}`);
        
        // Actualizar contador de canciones en el álbum
        await supabase
          .from('albumes')
          .update({ numero_canciones: tracks.length })
          .eq('id_album', savedAlbum.id_album);
        
        totalCanciones += tracks.length;
        
        for (const track of tracks) {
          // Guardar canción
          const savedTrack = await saveTrack(track, savedAlbum.id_album);
          if (savedTrack) {
            // Vincular canción con artistas (principal y colaboradores)
            await linkTrackArtists(savedTrack.id_cancion, track.artists);
          }
        }
      }
      
      // Actualizar contador de canciones en el artista
      await supabase
        .from('artistas')
        .update({ numero_canciones: totalCanciones })
        .eq('id_artista', savedArtist.id_artista);
    }
    
    console.log('Datos de artistas, álbumes y canciones almacenados correctamente');
  } catch (error) {
    console.error('Error al guardar datos:', error);
  }
};

const saveArtist = async (artist) => {
  // Verificar si el artista ya existe
  const { data: existingArtist } = await supabase
    .from('artistas')
    .select('*')
    .eq('spotify_id', artist.id)
    .single();
  
  if (existingArtist) {
    // Actualizar información existente
    const { data: updatedArtist, error: updateError } = await supabase
      .from('artistas')
      .update({
        nombre_artista: artist.name,
        foto_artista: artist.images?.[0]?.url || '',
        popularidad_artista: artist.popularity || 0,
      })
      .eq('id_artista', existingArtist.id_artista)
      .select();
    
    if (updateError) {
      console.error('Error al actualizar artista:', updateError);
      return existingArtist;
    }
    
    return updatedArtist[0];
  }
  
  // Insertar nuevo artista
  const artistData = {
    spotify_id: artist.id,
    nombre_artista: artist.name,
    biografia: artist.biography || '',
    foto_artista: artist.images?.[0]?.url || '',
    popularidad_artista: artist.popularity || 0,
  };
  
  const { data: insertedArtist, error: artistError } = await supabase
    .from('artistas')
    .insert(artistData)
    .select();
  
  if (artistError || !insertedArtist || insertedArtist.length === 0) {
    console.error('Error al insertar artista:', artistError);
    return null;
  }
  
  return insertedArtist[0];
};

const saveAlbum = async (album, artistId) => {
  // Verificar si el álbum ya existe
  const { data: existingAlbum } = await supabase
    .from('albumes')
    .select('*')
    .eq('spotify_id', album.id)
    .single();
  
  if (existingAlbum) {
    // Actualizar información existente
    const { data: updatedAlbum, error: updateError } = await supabase
      .from('albumes')
      .update({
        titulo: album.name,
        foto_album: album.images?.[0]?.url || '',
        popularidad_album: album.popularity || 0,
      })
      .eq('id_album', existingAlbum.id_album)
      .select();
    
    // Asegurar que exista la relación con el artista
    await supabase
      .from('album_artistas')
      .upsert({ album_id: existingAlbum.id_album, artista_id: artistId });
    
    if (updateError) {
      console.error('Error al actualizar álbum:', updateError);
      return existingAlbum;
    }
    
    return updatedAlbum[0];
  }
  
  // Insertar nuevo álbum
  const albumData = {
    spotify_id: album.id,
    titulo: album.name,
    anio: new Date(album.release_date).getFullYear(),
    foto_album: album.images?.[0]?.url || '',
    numero_canciones: album.total_tracks || 0,
    tipo_album: album.album_type || 'album',
    popularidad_album: album.popularity || 0,
  };
  
  const { data: insertedAlbum, error: albumError } = await supabase
    .from('albumes')
    .insert(albumData)
    .select();
  
  if (albumError || !insertedAlbum || insertedAlbum.length === 0) {
    console.error('Error al insertar álbum:', albumError);
    return null;
  }
  
  // Crear relación entre álbum y artista
  await supabase
    .from('album_artistas')
    .upsert({ album_id: insertedAlbum[0].id_album, artista_id: artistId });
  
  return insertedAlbum[0];
};

const saveTrack = async (track, albumId) => {
  // Verificar si la canción ya existe
  const { data: existingTrack } = await supabase
    .from('canciones')
    .select('*')
    .eq('spotify_id', track.id)
    .single();
  
  if (existingTrack) {
    // Actualizar información existente
    const { data: updatedTrack, error: updateError } = await supabase
      .from('canciones')
      .update({
        titulo: track.name,
        orden: track.track_number,
        duracion_ms: track.duration_ms,
        preview_url: track.preview_url || '',
      })
      .eq('id_cancion', existingTrack.id_cancion)
      .select();
    
    if (updateError) {
      console.error('Error al actualizar canción:', updateError);
      return existingTrack;
    }
    
    return updatedTrack[0];
  }
  
  // Insertar nueva canción
  const trackData = {
    spotify_id: track.id,
    titulo: track.name,
    album: albumId,
    orden: track.track_number,
    duracion_ms: track.duration_ms,
    popularidad: track.popularity || 0,
    preview_url: track.preview_url || '',
    categoria: 'normal',
  };
  
  const { data: insertedTrack, error: trackError } = await supabase
    .from('canciones')
    .insert(trackData)
    .select();
  
  if (trackError || !insertedTrack || insertedTrack.length === 0) {
    console.error('Error al insertar canción:', trackError);
    return null;
  }
  
  return insertedTrack[0];
};

const linkTrackArtists = async (trackId, artists) => {
  for (const artist of artists) {
    // Primero guardamos el artista si no existe
    const savedArtist = await saveArtist(artist);
    if (savedArtist) {
      // Luego creamos la relación entre canción y artista
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