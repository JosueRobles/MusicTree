const supabase = require('../config/db');
const spotifyApi = require('../config/spotifyAuth');
const lastFmApi = require('../config/lastfmAuth');
const { getSpotifyApi } = require('../config/spotifyAuth');

function normalizarGenero(genre) {
  const allowedGenres = [
    'Pop', 'Rock', 'Metal', 'Hip Hop', 'Rap', 'Folk',
    'Jazz', 'Classical', 'Electronic', 'Country', 'Reggae',
    'Blues', 'Punk',
  ];

  if (!genre) return null;

  const normalized = genre
    .trim()
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return allowedGenres.includes(normalized) ? normalized : null;
}

// Obtener nombre del artista
async function obtenerNombreArtista(artistId) {
  try {
    const { data: artist } = await supabase
      .from('artistas')
      .select('nombre_artista')
      .eq('id_artista', artistId)
      .single();

    return artist ? artist.nombre_artista : null;
  } catch (error) {
    console.error(`Error al obtener el nombre del artista ${artistId}:`, error.message);
    return null;
  }
}

// Corregido para usar spotify-web-api-node
async function obtenerGenerosDeSpotify(artistId) {
  try {
    const spotifyClient = getSpotifyApi();
    const response = await spotifyApi.getArtist(artistId);  // Cambiado de .get a .getArtist
    return response.genres || [];
  } catch (error) {
    console.error(`Error al consultar géneros en Spotify para el artista ${artistId}:`, error);
    return [];
  }
}

// Consultar géneros en LastFM
async function obtenerGenerosDeLastFM(nombre, artista = null) {
  try {
    const params = { method: artista ? 'album.gettoptags' : 'artist.gettoptags', artist: artista || nombre, album: nombre };
    const response = await lastFmApi.get('', { params });
    return response.data.toptags.tag.map(tag => tag.name) || [];
  } catch (error) {
    console.error(`Error al consultar géneros en LastFM para ${nombre}:`, error);
    return [];
  }
}

async function insertarGenerosPrincipales(mainGenres) {
  for (const genre of mainGenres) {
    try {
      // Verificar si el género ya existe
      const { data: existingGenres, error: selectError } = await supabase
        .from('generos')
        .select('id_genero')
        .eq('nombre', genre)
        .limit(1); // Usar limit(1) para evitar errores con single()

      if (selectError) throw selectError;

      if (!existingGenres || existingGenres.length === 0) {
        // Insertar el género si no existe
        const { data: newGenre, error: insertError } = await supabase
          .from('generos')
          .insert({ nombre: genre })
          .select()
          .single();

        if (insertError) throw insertError;

        console.log(`✅ Género insertado: ${newGenre.nombre}`);
      } else {
        console.log(`ℹ️ Género ya existente: ${genre}`);
      }
    } catch (error) {
      console.error(`❌ Error al insertar género ${genre}:`, error.message);
    }
  }
}

async function obtenerNombreArtistaDesdeEntidad(tipo, entidadId) {
  try {
    let artistaId;

    if (tipo === 'album') {
      const { data: albumArtista, error } = await supabase
        .from('album_artistas')
        .select('artista_id')
        .eq('album_id', entidadId)
        .single();

      if (error || !albumArtista || !albumArtista.artista_id) {
        console.warn(`⚠️ No se encontró relación de artista para el álbum con ID=${entidadId}`);
        return null;
      }

      artistaId = albumArtista.artista_id;
    } else if (tipo === 'cancion') {
      const { data: cancionArtista, error } = await supabase
        .from('cancion_artistas')
        .select('artista_id')
        .eq('cancion_id', entidadId)
        .single();

      if (error || !cancionArtista || !cancionArtista.artista_id) {
        console.warn(`⚠️ No se encontró relación de artista para la canción con ID=${entidadId}`);
        return null;
      }

      artistaId = cancionArtista.artista_id;
    } else {
      console.error(`❌ Tipo de entidad no válido: ${tipo}`);
      return null;
    }

    return await obtenerNombreArtista(artistaId);
  } catch (error) {
    console.error(`❌ Error al obtener el nombre del artista desde ${tipo}: ${error.message}`);
    return null;
  }
}

async function buscarGenerosDeAlbumOCancion(tipo, entidadId, titulo) {
  let tags = [];

  try {
    if (!titulo) {
      console.warn(`⚠️ ${tipo} inválido: ID=${entidadId}, Título ausente`);
      return;
    }

    const nombreArtista = await obtenerNombreArtistaDesdeEntidad(tipo, entidadId);
    if (!nombreArtista) {
      console.warn(`⚠️ No se pudo obtener el nombre del artista para el ${tipo} con ID=${entidadId}`);
      return;
    }

    try {
      const params = tipo === 'album'
        ? { method: 'album.gettoptags', artist: nombreArtista, album: titulo }
        : { method: 'track.gettoptags', artist: nombreArtista, track: titulo };

      const lastFmResponse = await lastFmApi.get('', { params });
      tags = lastFmResponse.data.toptags?.tag?.map(tag => tag.name) || [];
    } catch (lastFmError) {
      console.warn(`⚠️ Error al conectar con LastFM para el ${tipo} "${titulo}": ${lastFmError.message}`);
    }

    if (tags.length === 0) {
      console.warn(`⚠️ No se encontraron tags para ${tipo} "${titulo}"`);
      return;
    }

    const generosNormalizados = tags.map(normalizarGenero).filter(Boolean);
    if (generosNormalizados.length > 0) {
      await almacenarGenerosYRelacionar(tipo, entidadId, generosNormalizados);
      console.log(`✅ Géneros asignados al ${tipo} "${titulo}": ${generosNormalizados.join(', ')}`);
    } else {
      console.warn(`⚠️ Ningún género válido fue encontrado para el ${tipo} "${titulo}"`);
    }
  } catch (error) {
    console.error(`❌ Error al buscar géneros para el ${tipo} "${titulo}": ${error.message}`);
  }
}

async function almacenarGenerosYRelacionar(entityType, entityId, genres) {
  const genreIds = [];

  for (const genre of genres) {
    try {
      const { data: existingGenre } = await supabase
        .from('generos')
        .select('id_genero')
        .eq('nombre', genre)
        .single();

      let genreId = existingGenre ? existingGenre.id_genero : null;

      if (!genreId) {
        const { data: newGenre, error: insertError } = await supabase
          .from('generos')
          .insert({ nombre: genre })
          .select()
          .single();

        if (insertError) {
          console.error(`Error al insertar el género ${genre}: ${insertError.message}`);
          continue;
        }

        genreId = newGenre.id_genero;
      }

      genreIds.push(genreId);
    } catch (error) {
      console.error(`Error al verificar o insertar el género ${genre}: ${error.message}`);
    }
  }

  const tableName = `${entityType}_generos`;

  for (const genreId of genreIds) {
    try {
      await supabase
        .from(tableName)
        .upsert({ [`${entityType}_id`]: entityId, genero_id: genreId });
    } catch (error) {
      console.error(`Error al relacionar género ${genreId} con ${entityType} ${entityId}: ${error.message}`);
    }
  }
}

async function buscarGenerosDeArtista(artistaId, nombreArtista) {
  let generos = [];

  try {
    if (!artistaId || !nombreArtista) {
      console.warn(`⚠️ Artista inválido: ID=${artistaId}, Nombre=${nombreArtista}`);
      return;
    }

    const { data: artistData, error: artistError } = await supabase
      .from('artistas')
      .select('spotify_id')
      .eq('id_artista', artistaId)
      .single();

    if (artistError || !artistData || !artistData.spotify_id) {
      console.warn(`❌ No se encontró el spotify_id para el artista: ${nombreArtista}`);
      return;
    }

    const spotifyId = artistData.spotify_id;

    // Intentar obtener géneros desde Spotify
    try {
      generos = await obtenerGenerosDeSpotify(spotifyId);
    } catch (spotifyError) {
      console.warn(`⚠️ Error al conectar con Spotify para el artista ${nombreArtista}: ${spotifyError.message}`);
    }

    // Intentar obtener géneros desde LastFM si Spotify no devuelve datos
    if (generos.length === 0) {
      try {
        generos = await obtenerGenerosDeLastFM(nombreArtista);
      } catch (lastFmError) {
        console.warn(`⚠️ Error al conectar con LastFM para el artista ${nombreArtista}: ${lastFmError.message}`);
      }
    }

    if (generos.length === 0) {
      console.warn(`⚠️ No se encontraron géneros para el artista: ${nombreArtista}`);
      return;
    }

    const generosNormalizados = generos.map(normalizarGenero).filter(Boolean);
    if (generosNormalizados.length > 0) {
      await almacenarGenerosYRelacionar('artista', artistaId, generosNormalizados);
      console.log(`✅ Géneros asignados al artista ${nombreArtista}: ${generosNormalizados.join(', ')}`);
    } else {
      console.warn(`⚠️ Ningún género válido fue encontrado para el artista: ${nombreArtista}`);
    }
  } catch (error) {
    console.error(`❌ Error al buscar géneros para el artista ${nombreArtista}: ${error.message}`);
  }
}

module.exports = {
  buscarGenerosDeArtista,
  buscarGenerosDeAlbumOCancion,
  insertarGenerosPrincipales,
  normalizarGenero,
  obtenerGenerosDeSpotify,
  obtenerGenerosDeLastFM,
  almacenarGenerosYRelacionar,
  obtenerNombreArtista,
};