const supabase = require('../config/db');
const spotifyApi = require('../config/spotifyAuth');
const lastFmApi = require('../config/lastfmAuth');
const { getSpotifyApi } = require('../config/spotifyAuth');
const { safeSpotifyCall } = require('./spotifySafeCall');

function normalizarGenero(genre) {
  const allowedGenres = [
    'Pop', 'Rock', 'Metal', 'Hip Hop', 'Folk',
    'Jazz', 'Classical', 'Electronic', 'Country', 'Reggae',
    'Blues', 'R&B', 'Latin'
    
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
    const spotifyApi = getSpotifyApi();
    const response = await safeSpotifyCall(() => spotifyApi.getArtist(artistId));
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
    const tags = response.data?.toptags?.tag;
    if (!tags || !Array.isArray(tags)) return [];
    return tags.map(tag => tag.name) || [];
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

async function buscarGenerosDeArtista(artistaId, nombreArtista) {
  let generos = [];

  try {
    if (!artistaId || !nombreArtista) return;

    const { data: artistData } = await supabase
      .from('artistas')
      .select('spotify_id')
      .eq('id_artista', artistaId)
      .single();

    if (!artistData || !artistData.spotify_id) return;

    const spotifyId = artistData.spotify_id;

    // Spotify
    try {
      generos = await obtenerGenerosDeSpotify(spotifyId);
    } catch {}

    // LastFM si Spotify no devuelve nada
    if (generos.length === 0) {
      try {
        generos = await obtenerGenerosDeLastFM(nombreArtista);
      } catch {}
    }

    if (generos.length === 0) return;

    // Aquí: pasa todos los géneros extraídos (no solo los principales)
    await almacenarGenerosYRelacionar('artista', artistaId, generos);
  } catch (error) {
    console.error(`❌ Error al buscar géneros para el artista ${nombreArtista}: ${error.message}`);
  }
}

async function buscarGenerosDeAlbumOCancion(tipo, entidadId, titulo) {
  let tags = [];

  try {
    if (!titulo) return;

    const nombreArtista = await obtenerNombreArtistaDesdeEntidad(tipo, entidadId);
    if (!nombreArtista) return;

    try {
      const params = tipo === 'album'
        ? { method: 'album.gettoptags', artist: nombreArtista, album: titulo }
        : { method: 'track.gettoptags', artist: nombreArtista, track: titulo };

      const lastFmResponse = await lastFmApi.get('', { params });
      // SOLO los tags con count >= 50
      tags = (lastFmResponse.data.toptags?.tag || [])
        .filter(tag => tag.count && tag.count >= 50)
        .map(tag => tag.name);
    } catch {}

    if (tags.length === 0) return;

    await almacenarGenerosYRelacionar(tipo, entidadId, tags);
  } catch (error) {
    console.error(`❌ Error al buscar géneros para el ${tipo} "${titulo}": ${error.message}`);
  }
}

// Normaliza y busca género principal y subgéneros
async function obtenerGeneroPrincipalYSubgeneros(generosExtraidos) {
  // 1. Normaliza todos los géneros extraídos
  const normalizados = generosExtraidos
    .map(g => g && typeof g === 'string' ? g.trim().toLowerCase() : null)
    .filter(Boolean);

  // 2. Trae todos los géneros principales y subgéneros de la BD
  const { data: generosBD } = await supabase
    .from('generos')
    .select('id_genero, nombre, subgeneros');

  const resultado = [];

  for (const norm of normalizados) {
    // ¿Es principal?
    const principal = generosBD.find(g => g.nombre && g.nombre.trim().toLowerCase() === norm);
    if (principal) {
      resultado.push({ id_genero: principal.id_genero, principal: principal.nombre, subgeneros: [] });
      continue;
    }
    // ¿Es subgénero de algún principal?
    for (const g of generosBD) {
      if (g.subgeneros && Array.isArray(g.subgeneros)) {
        if (g.subgeneros.map(s => s.trim().toLowerCase()).includes(norm)) {
          // Si ya existe en resultado, solo agrega subgénero
          let ya = resultado.find(r => r.id_genero === g.id_genero);
          if (!ya) {
            resultado.push({ id_genero: g.id_genero, principal: g.nombre, subgeneros: [norm] });
          } else if (!ya.subgeneros.includes(norm)) {
            ya.subgeneros.push(norm);
          }
        }
      }
    }
  }
  return resultado;
}

// MODIFICA esta función para guardar subgéneros
async function almacenarGenerosYRelacionar(entityType, entityId, generosExtraidos) {
  const generosRelacion = await obtenerGeneroPrincipalYSubgeneros(generosExtraidos);

  const tableName = `${entityType}_generos`;
  const idField = `${entityType}_id`;

  for (const relacion of generosRelacion) {
    await supabase
      .from(tableName)
      .upsert({
        [idField]: entityId,
        genero_id: relacion.id_genero,
        subgeneros: relacion.subgeneros.length > 0 ? relacion.subgeneros : null
      }, { onConflict: [idField, 'genero_id'] });
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
  obtenerGeneroPrincipalYSubgeneros, // Exporta si lo necesitas
};