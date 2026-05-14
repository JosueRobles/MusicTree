const supabase = require('../supabaseClient');
const { registrarActividad } = require('./utils/actividadUtils');
const { esCancionSimilar } = require('./albumController');
const { getSpotifyApi } = require('./config/spotifyAuth');
const { safeSpotifyCall } = require('./utils/spotifySafeCall');
const { insertOrUpdateArtist } = require('./utils/supabaseHelpers');
const { almacenarGenerosYRelacionar } = require('./utils/genreHelpers');

const getCatalogosByUsuario = async (req, res) => {
  const { usuarioId } = req.params;
  try {
    // Trae progreso de la vista
    const { data, error } = await supabase
      .from('vista_progreso_catalogos')
      .select('id_artista, nombre_artista, foto_artista, progreso, es_principal')
      .eq('usuario_id', usuarioId);

    if (error) throw error;

    // Trae valoraciones del usuario
    const [valsAlb, valsCan, valsVid] = await Promise.all([
      supabase.from('valoraciones_albumes').select('album').eq('usuario', usuarioId),
      supabase.from('valoraciones_canciones').select('cancion').eq('usuario', usuarioId),
      supabase.from('valoraciones_videos_musicales').select('video').eq('usuario', usuarioId),
    ]);
    const valorados = new Set([
      ...(valsAlb.data || []).map(v => v.album),
      ...(valsCan.data || []).map(v => v.cancion),
      ...(valsVid.data || []).map(v => v.video),
    ]);

    // Solo muestra progreso si valoró al menos una entidad de ese artista
    // Devuelve todos los catálogos principales, aunque el progreso sea 0
    const resultado = data; // <-- Quita el filtro por progreso

    res.status(200).json(resultado);
  } catch (err) {
    console.error('Error al obtener progreso de catálogos:', err);
    res.status(500).json({ error: 'Error al obtener progreso de catálogos.' });
  }
};

const seguirArtistaCatalogo = async (req, res) => {
  const { usuario_id, artista_id } = req.body;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: 'Faltan datos.' });

  // Permitir array de artista_id
  const artistas = Array.isArray(artista_id) ? artista_id : [artista_id];

  try {
    let nuevos = 0;
    for (const id of artistas) {
      // Verifica si ya existe
      const { data: existente } = await supabase
        .from('seguimiento_artistas')
        .select('id')
        .eq('usuario_id', usuario_id)
        .eq('artista_id', id)
        .single();

      if (!existente) {
        const { error } = await supabase
          .from('seguimiento_artistas')
          .insert([{ usuario_id, artista_id: id }]);
        if (error) throw error;
        nuevos++;
        await registrarActividad(usuario_id, 'seguimiento_artista', 'artista', id);
      }
    }
    res.status(201).json({ message: `Ahora sigues a ${nuevos} artista(s).` });
  } catch (err) {
    res.status(500).json({ error: 'Error al seguir artista.' });
  }
};

const getArtistasSeguidos = async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const { data, error } = await supabase
      .from('seguimiento_artistas')
      .select('artista_id, artistas(nombre_artista, foto_artista)')
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    res.status(200).json(data.map(a => ({
      id_artista: a.artista_id,
      nombre_artista: a.artistas.nombre_artista,
      foto_artista: a.artistas.foto_artista
    })));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener artistas seguidos.' });
  }
};

const dejarDeSeguirArtista = async (req, res) => {
  const { usuario_id, artista_id } = req.body;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: 'Faltan datos.' });

  try {
    const { error } = await supabase
      .from('seguimiento_artistas')
      .delete()
      .eq('usuario_id', usuario_id)
      .eq('artista_id', artista_id);

    if (error) throw error;

    res.status(200).json({ message: 'Has dejado de seguir al artista.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al dejar de seguir artista.' });
  }
};

// NUEVO: Progreso de canciones de un artista considerando similaridad
const getProgresoCancionesArtista = async (req, res) => {
  const { usuario_id, artista_id } = req.query;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: "Faltan parámetros" });

  // 1. Todas las canciones del artista
  const { data: canciones } = await supabase
    .from('cancion_artistas')
    .select('cancion_id, canciones(titulo, duracion_ms)')
    .eq('artista_id', artista_id);

  // 2. Canciones valoradas por el usuario
  const { data: valoradas } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuario_id);

  const valoradasIds = new Set((valoradas || []).map(v => v.cancion));
  const cancionesFull = (canciones || []).map(c => ({
    id_cancion: c.cancion_id,
    titulo: c.canciones?.titulo || "",
    duracion_ms: c.canciones?.duracion_ms || 0
  }));

  // 3. Marca como valorada si es igual o similar a una valorada
  let valoradasOEquivalentes = new Set();
  for (const song of cancionesFull) {
    if (valoradasIds.has(song.id_cancion)) {
      valoradasOEquivalentes.add(song.id_cancion);
      continue;
    }
    // Busca si hay una valorada similar
    for (const vId of valoradasIds) {
      const vSong = cancionesFull.find(s => s.id_cancion === vId);
      if (vSong && esCancionSimilar(song, vSong)) {
        valoradasOEquivalentes.add(song.id_cancion);
        break;
      }
    }
  }

  const total = cancionesFull.length;
  const valoradasCount = valoradasOEquivalentes.size;
  const porcentaje = total ? Math.round((valoradasCount / total) * 100) : 0;

  res.json({
    total,
    valoradas: valoradasCount,
    porcentaje,
    ids_valoradas: Array.from(valoradasOEquivalentes)
  });
};

// Buscar artistas en Spotify (no crea en BD) - body: { term }
const searchSpotifyArtists = async (req, res) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ error: 'Falta term' });
  try {
    const spotifyApi = getSpotifyApi();
    const data = await safeSpotifyCall(() => spotifyApi.searchArtists(term, { limit: 10 }));
    const items = (data.body && data.body.artists && data.body.artists.items) ? data.body.artists.items : [];
    const simplified = items.map(a => ({
      spotify_id: a.id,
      nombre: a.name,
      foto: a.images && a.images.length ? a.images[0].url : null,
      popularidad: a.popularity || 0
    }));
    res.json(simplified);
  } catch (err) {
    console.error('Error searching Spotify artists:', err);
    res.status(500).json({ error: 'Error buscando en Spotify' });
  }
};

// Crear artista en la BD a partir de spotify_id (body: { spotify_id, usuario_id? })
const getPedidosUsuario = async (req, res) => {
  const { usuario_id } = req.params;
  try {
    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos_catalogo')
      .select('id, artista_id, fecha')
      .eq('usuario_id', usuario_id)
      .order('fecha', { ascending: true });

    if (pedidosError) throw pedidosError;

    const artistIds = [...new Set((pedidos || []).map(p => p.artista_id).filter(Boolean))];
    let artistasMap = {};

    if (artistIds.length) {
      const { data: artistas, error: artistasError } = await supabase
        .from('artistas')
        .select('id_artista, nombre_artista, foto_artista')
        .in('id_artista', artistIds);

      if (artistasError) throw artistasError;

      artistasMap = (artistas || []).reduce((acc, art) => {
        acc[art.id_artista] = art;
        return acc;
      }, {});
    }

    const resultado = (pedidos || []).map(p => ({
      id: p.id,
      artista_id: p.artista_id,
      fecha: p.fecha,
      nombre_artista: artistasMap[p.artista_id]?.nombre_artista || null,
      foto_artista: artistasMap[p.artista_id]?.foto_artista || null
    }));

    res.status(200).json(resultado);
  } catch (err) {
    console.error('Error al obtener pedidos de usuario:', err);
    res.status(500).json({ error: 'Error al obtener pedidos de usuario.' });
  }
};

const createArtistFromSpotify = async (req, res) => {
  const { spotify_id, usuario_id } = req.body;
  if (!spotify_id) return res.status(400).json({ error: 'Falta spotify_id' });
  try {
    const spotifyApi = getSpotifyApi();
    const data = await safeSpotifyCall(() => spotifyApi.getArtist(spotify_id));
    const artist = data.body;
    const nombre_artista = artist.name || null;
    const foto_artista = artist.images && artist.images.length ? artist.images[0].url : null;
    const popularidad_artista = artist.popularity || 0;

    // Preferir helper que ya existe para insertar/actualizar artista y obtener id_artista
    const artistForUpsert = {
      id: spotify_id,
      name: nombre_artista,
      images: artist.images || [],
      popularity: artist.popularity || 0,
    };

    const newArtistId = await insertOrUpdateArtist(artistForUpsert);
    if (!newArtistId) {
      return res.status(500).json({ error: 'Error guardando artista' });
    }

    // Asociar géneros si vienen desde Spotify
    try {
      const genres = Array.isArray(artist.genres) ? artist.genres : [];
      if (genres.length > 0) {
        await almacenarGenerosYRelacionar('artista', newArtistId, genres);
      }
    } catch (e) {
      console.warn('No se pudo asociar géneros al artista:', e.message || e);
    }

    // Si el cliente envía usuario_id intentamos crear un pedido/voto en la tabla correcta 'pedidos_catalogo'
    if (usuario_id) {
      try {
        await supabase.from('pedidos_catalogo').insert([{ usuario_id, artista_id: newArtistId, fecha: new Date() }]);
      } catch (e) {
        console.warn('No se pudo insertar pedido automático:', e.message || e);
      }
    }

    // Devolver registro mínimo
    const { data: createdRec } = await supabase.from('artistas').select('*').eq('id_artista', newArtistId).maybeSingle();
    res.status(201).json(createdRec || { id_artista: newArtistId });
  } catch (err) {
    console.error('Error creating artist from Spotify:', err);
    res.status(500).json({ error: 'Error al crear artista desde Spotify' });
  }
};

module.exports = { getCatalogosByUsuario, seguirArtistaCatalogo, getArtistasSeguidos, dejarDeSeguirArtista, getProgresoCancionesArtista, searchSpotifyArtists, createArtistFromSpotify, getPedidosUsuario };
