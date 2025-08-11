const supabase = require('../../supabaseClient'); // Importar correctamente la instancia
if (!supabase) {
  throw new Error("⚠️ Supabase no está configurado correctamente. Verifica supabaseClient.js.");
}

// Función para verificar si una canción ya existe en la base de datos
async function trackExistsInDB(trackId) {
  try {
    const { data, error } = await supabase
      .from('canciones')
      .select('id_cancion')
      .eq('spotify_id', trackId)
      .maybeSingle();
    
    if (error) {
      console.error("Error al verificar si la canción existe en la base de datos:", error);
      throw error;
    }

    return !!data;
  } catch (err) {
    console.error("Error en trackExistsInDB:", err);
    throw err;
  }
}

async function saveArtistToDB(artist, coleccionable) {
  const { data, error } = await supabase
    .from('artistas')
    .upsert({
      id: artist.id,
      nombre: artist.name,
      imagen: artist.images?.[0]?.url || null,
      coleccionable
    });
  return data?.[0];
}

async function saveAlbumsToDB(albums, artistId) {
  const albumsToInsert = albums.map(album => ({
    id: album.id,
    nombre: album.name,
    artista_id: artistId,
    imagen: album.images?.[0]?.url || null
  }));

  await supabase.from('albumes').upsert(albumsToInsert);
  return albumsToInsert;
}

async function saveTrackToDB(track, albumId) {
  await supabase.from('canciones').upsert({
    id: track.id,
    nombre: track.name,
    album_id: albumId,
    duracion_ms: track.duration_ms,
    popularidad: track.popularity
  });
}

async function linkCollaborators(track, albumId) {
  for (const artist of track.artists) {
    await supabase.from('colaboraciones').upsert({
      artista_id: artist.id,
      cancion_id: track.id,
      album_id: albumId
    });
  }
}

async function saveGenreToDB(genres, artistId) {
  for (const genre of genres) {
    await supabase.from('generos_artistas').upsert({
      artista_id: artistId,
      genero: genre
    });
  }
}

async function markArtistAsMain(artistId) {
  await supabase.from('artistas').update({ coleccionable: true }).eq('id', artistId);
}

async function updateArtistType(artistId, coleccionable) {
  await supabase.from('artistas').update({ coleccionable }).eq('id', artistId);
}

async function insertOrUpdateArtist(artist) {
  try {
    if (!artist.name) {
      throw new Error(`El artista con ID ${artist.id} no tiene un nombre válido.`);
    }

    // Consulta actual
    const { data: existingArtist } = await supabase
      .from('artistas')
      .select('id_artista, es_principal')
      .eq('spotify_id', artist.id)
      .maybeSingle();

    let esPrincipal = false;
    if (existingArtist && existingArtist.es_principal === true) {
      esPrincipal = true;
    }

    const { data, error } = await supabase.from('artistas').upsert(
      {
        spotify_id: artist.id,
        nombre_artista: artist.name,
        foto_artista: artist.images?.[0]?.url || null,
        popularidad_artista: artist.popularity || 0,
        es_principal: esPrincipal, // Solo lo pones en false si es nuevo
      },
      { onConflict: ['spotify_id'] }
    ).select('id_artista');

    if (error) {
      console.error("Error al insertar o actualizar artista:", error);
      throw error;
    }

    return data?.[0]?.id_artista;
  } catch (err) {
    console.error("Error en insertOrUpdateArtist:", err.message || err);
    return null;
  }
}

const insertOrUpdateAlbum = async (album, categoria = 'catalogo') => {
  try {
    // Consulta el álbum existente
    const { data: existing, error: existingError } = await supabase
      .from('albumes')
      .select('categoria')
      .eq('spotify_id', album.id)
      .maybeSingle();

    let categoriaFinal = categoria;
    if (existing && existing.categoria && !existing.categoria.includes(categoria)) {
      // Si ya existe y no tiene el nuevo valor, lo concatenas
      categoriaFinal = existing.categoria + ' ' + categoria;
    }

    const { data, error } = await supabase.from('albumes').upsert(
      {
        spotify_id: album.id,
        titulo: album.name,
        anio: album.release_date ? new Date(album.release_date).getFullYear() : null,
        foto_album: album.images?.[0]?.url || null,
        numero_canciones: album.total_tracks,
        tipo_album: album.album_type,
        popularidad_album: album.popularity || 0,
        categoria: categoriaFinal, // <-- aquí se guarda el valor concatenado
      },
      { onConflict: ['spotify_id'] }
    ).select('id_album, spotify_id');
    if (error) {
      console.error("Error al insertar o actualizar álbum:", error);
      throw error;
    }
    return data?.[0];
  } catch (err) {
    console.error("Error en insertOrUpdateAlbum:", err);
    throw err;
  }
};

const insertOrUpdateTrack = async (track, albumId, categoria = 'catalogo') => {
  try {
    let categoriaFinal = categoria;
    const { data: existing, error: existingError } = await supabase
      .from('canciones')
      .select('categoria')
      .eq('spotify_id', track.id)
      .maybeSingle();
    if (existing && existing.categoria && !existing.categoria.includes(categoria)) {
      categoriaFinal = existing.categoria + ' ' + categoria;
    }
    const { data, error } = await supabase.from('canciones').upsert({
      spotify_id: track.id,
      titulo: track.name,
      album: albumId,
      duracion_ms: track.duration_ms,
      popularidad: track.popularity ?? 0, // <-- Asegura que se inserte popularidad
      orden: track.track_number,
      categoria: categoriaFinal,
    }, { onConflict: ['spotify_id'] }).select('id_cancion');
    if (error) {
      console.error("Error al insertar o actualizar canción:", error);
      throw error;
    }
    return data?.[0]?.id_cancion;
  } catch (err) {
    console.error("Error en insertOrUpdateTrack:", err);
    throw err;
  }
};

async function createOrGetCollection() {
  try {
    // Verificar si ya existe la colección
    const { data, error } = await supabase
      .from('colecciones')
      .select('id_coleccion')
      .eq('nombre', 'Canciones con +1 mil millones de reproducciones en Spotify')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error al verificar la colección:", error);
      throw error;
    }

    if (data) {
      return data.id_coleccion; // Devuelve el ID si ya existe
    }

    // Crear la colección si no existe
    const { data: newCollection, error: createError } = await supabase
      .from('colecciones')
      .insert({
        nombre: 'Canciones con +1 mil millones de reproducciones en Spotify',
        descripcion: 'Canciones que han superado los mil millones de reproducciones en Spotify.',
        icono: '../frontend/src/assets/logo.png',
        tipo_coleccion: 'canciones',
        criterios: JSON.stringify({ base: 'Spotify', total_canciones: 926 }) // Ejemplo de criterios
      })
      .select('id_coleccion')
      .single();

    if (createError) {
      console.error("Error al crear la colección:", createError);
      throw createError;
    }

    return newCollection.id_coleccion;
  } catch (err) {
    console.error("Error en createOrGetCollection:", err);
    throw err;
  }
}

async function addTrackToCollection(trackId, collectionId) {
  try {
    const { error } = await supabase.from('colecciones_elementos').upsert(
      {
        coleccion_id: collectionId,
        entidad_tipo: 'cancion',
        entidad_id: trackId
      },
      { onConflict: ['coleccion_id', 'entidad_tipo', 'entidad_id'] }
    );

    if (error) {
      console.error(`Error al agregar la canción ${trackId} a la colección ${collectionId}:`, error);
      throw error;
    }
  } catch (err) {
    console.error(`Error en addTrackToCollection para la canción ${trackId}:`, err);
    throw err;
  }
}

// Obtener todos los álbumes de la base de datos
async function getAllAlbumsFromDB() {
  try {
    const { data, error } = await supabase
      .from('albumes')
      .select('id_album, spotify_id, titulo');

    if (error) {
      console.error("Error al obtener álbumes desde la base de datos:", error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error("Error en getAllAlbumsFromDB:", err);
    throw err;
  }
}

// Obtener todos los artistas de la base de datos
async function getAllArtistsFromDB() {
  try {
    const { data, error } = await supabase
      .from('artistas')
      .select('id_artista, spotify_id, nombre_artista');

    if (error) {
      console.error("Error al obtener artistas desde la base de datos:", error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error("Error en getAllArtistsFromDB:", err);
    throw err;
  }
}

async function updateArtistPopularity(artistId, popularity) {
  try {
    const { error } = await supabase
      .from('artistas')
      .update({ popularidad_artista: popularity })
      .eq('id_artista', artistId);

    if (error) {
      console.error(`Error al actualizar la popularidad del artista ${artistId}:`, error);
      throw error;
    }
  } catch (err) {
    console.error(`Error en updateArtistPopularity para ${artistId}:`, err);
    throw err;
  }
}

async function updateAlbumPopularity(albumId, popularity) {
  try {
    const { error } = await supabase
      .from('albumes')
      .update({ popularidad_album: popularity })
      .eq('id_album', albumId);

    if (error) {
      console.error(`Error al actualizar la popularidad del álbum ${albumId}:`, error);
      throw error;
    }
  } catch (err) {
    console.error(`Error en updateAlbumPopularity para ${albumId}:`, err);
    throw err;
  }
}

// Vincular un álbum con un artista en la tabla 'album_artistas'
async function linkAlbumWithArtist(albumId, artistId) {
  try {
    const { error } = await supabase.from('album_artistas').upsert(
      {
        album_id: albumId, // ID del álbum
        artista_id: artistId, // ID del artista
      },
      { onConflict: ['album_id', 'artista_id'] } // Evitar duplicados
    );

    if (error) {
      console.error(`Error al vincular álbum ${albumId} con artista ${artistId}:`, error);
      throw error;
    }

    console.log(`✅ Vinculación exitosa: Álbum ${albumId} con Artista ${artistId}`);
  } catch (err) {
    console.error(`Error en linkAlbumWithArtist:`, err);
    throw err;
  }
}

async function updateTrackPopularity(trackId, popularity) {
  try {
    const { error } = await supabase
      .from('canciones')
      .update({ popularidad: popularity })
      .eq('id_cancion', trackId);

    if (error) {
      console.error(`Error al actualizar la popularidad de la canción ${trackId}:`, error);
      throw error;
    }
  } catch (err) {
    console.error(`Error en updateTrackPopularity para ${trackId}:`, err);
    throw err;
  }
}

module.exports = {
  linkAlbumWithArtist, // Exportar la nueva función
  getAllAlbumsFromDB,
  getAllArtistsFromDB,
  trackExistsInDB, insertOrUpdateAlbum, insertOrUpdateArtist, updateArtistPopularity, updateAlbumPopularity, createOrGetCollection, addTrackToCollection, saveArtistToDB, saveAlbumsToDB, saveTrackToDB, linkCollaborators, saveGenreToDB, markArtistAsMain, updateArtistType, insertOrUpdateTrack, updateTrackPopularity
};
