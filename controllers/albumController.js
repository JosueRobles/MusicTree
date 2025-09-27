const supabase = require("../db");
const { notificarNuevosLanzamientos } = require('./utils/notifyHelpers');
const axios = require('axios');

const crearAlbum = async (req, res) => {
  const { titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album } = req.body;

  try {
    const { data, error } = await supabase
      .from('albumes')
      .insert([{ titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album }])
      .single();

    if (error) throw error;

    // Notificar sobre el nuevo lanzamiento
    if (data && data.id_album && artista_id) {
      await notificarNuevosLanzamientos(
        artista_id,
        'album',
        data.id_album,
        `¡Nuevo álbum de ${titulo}!`
      );
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerAlbumes = async (req, res) => {
    const { termino } = req.query;
    let query = supabase.from('albumes').select('*');
    if (termino) query = query.ilike('titulo', `%${termino}%`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

const obtenerAlbumPorId = async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener información del álbum
    const { data: album, error: albumError } = await supabase
      .from('albumes')
      .select('*')
      .eq('id_album', id)
      .single();
    
    if (albumError) {
      console.error("Error al obtener álbum:", albumError);
      return res.status(404).json({ error: "Álbum no encontrado" });
    }
    
    // El frontend espera esta estructura de respuesta específica,
    // así que asegúrate de mantenerla
    res.json({ 
      album,
      // No incluimos canciones aquí porque el frontend las obtiene por separado
    });
    
  } catch (error) {
    console.error("❌ Error al obtener álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarAlbum = async (req, res) => {
  const { id } = req.params;
  const { titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album } = req.body;

  try {
    const { data, error } = await supabase
      .from('albumes')
      .update({ titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album })
      .eq('id_album', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error al actualizar álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarAlbum = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('albumes')
      .delete()
      .eq('id_album', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    res.json({ message: "Álbum eliminado con éxito" });
  } catch (error) {
    console.error("❌ Error al eliminar álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const sugerirCancionesNuevasAlbum = async (req, res) => {
  const { usuario_id, id_album } = req.query;

  // 1. Canciones del álbum
  const { data: cancionesAlbum, error: errorAlbum } = await supabase
    .from('canciones')
    .select('id_cancion')
    .eq('album', id_album);

  if (errorAlbum) {
    console.error("Error consultando canciones:", errorAlbum);
    return res.status(500).json({ error: "Error obteniendo canciones" });
  }

  // 2. Canciones valoradas por el usuario
  const { data: valoradas, error: errorVal } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuario_id);

  if (errorVal) {
    console.error("Error consultando valoraciones:", errorVal);
    return res.status(500).json({ error: "Error obteniendo valoraciones" });
  }

  // Si no hay valoradas, que sea []
  const valoradasIds = (valoradas || []).map(v => v.cancion);

  // Solo filtra canciones del álbum que el usuario NO ha valorado
  const nuevas = cancionesAlbum.filter(c => !valoradasIds.includes(c.id_cancion));
  res.json({ nuevas });
};

const sugerirAlbumSimilar = async (req, res) => {
  const { usuario_id, id_album } = req.query;

  // 1. Canciones del álbum actual (trae también duración)
  const { data: cancionesAlbum, error: errorAlbum } = await supabase
    .from('canciones')
    .select('id_cancion, titulo, duracion_ms')
    .eq('album', id_album);

  if (errorAlbum) {
    console.error("Error consultando canciones:", errorAlbum);
    return res.status(500).json({ error: "Error obteniendo canciones" });
  }

  // 2. Canciones valoradas por el usuario
  const { data: valoradasCancion, error: errorVal } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuario_id);

  if (errorVal) {
    console.error("Error consultando valoraciones:", errorVal);
    return res.status(500).json({ error: "Error obteniendo valoraciones" });
  }

  const valoradasIds = (valoradasCancion || []).map(v => v.cancion);

  // 3. Obtener cluster del álbum y todos los miembros del grupo
  const { data: clusterData } = await supabase
    .from('album_clusters')
    .select('grupo')
    .eq('id_album', id_album)
    .single();
  if (!clusterData) return res.json({ mensaje: null, nuevas: [], valoradas_en_otros_albumes: [] });

  const grupo = clusterData.grupo;

  const { data: miembrosGrupo } = await supabase
    .from('album_clusters')
    .select('id_album')
    .eq('grupo', grupo);
  const idsGrupo = miembrosGrupo.map(a => a.id_album);

  // 4. Buscar canciones de otros álbumes del grupo (excluyendo el actual)
  const { data: cancionesOtrosAlbumes } = await supabase
    .from('canciones')
    .select('id_cancion, album, titulo, duracion_ms')
    .in('album', idsGrupo.filter(id => id !== Number(id_album)));

  // 5. Matching avanzado: para cada canción del álbum actual, busca si hay una valorada similar en otros álbumes del grupo
  const valoradasEnOtrosAlbumes = [];
  for (const cActual of cancionesAlbum) {
    for (const cOtro of cancionesOtrosAlbumes || []) {
      if (valoradasIds.includes(cOtro.id_cancion) && esCancionSimilar(cActual, cOtro)) {
        valoradasEnOtrosAlbumes.push(cActual.id_cancion);
        break;
      }
    }
  }

  // 6. Filtrar canciones del álbum actual que no están valoradas por el usuario
  const nuevas = cancionesAlbum.filter(c => !valoradasIds.includes(c.id_cancion) && !valoradasEnOtrosAlbumes.includes(c.id_cancion));

  // 7. Revisar cuál álbum del grupo ya valoró el usuario
  const { data: valoradasAlbum } = await supabase
    .from('valoraciones_albumes')
    .select('album')
    .eq('usuario', usuario_id);
  const valoradasAlbumIds = valoradasAlbum.map(v => v.album);

  const album_valorado_id = idsGrupo
    .filter(id => id !== Number(id_album))
    .find(id => valoradasAlbumIds.includes(id));

  // 8. Mensaje final
  const mensaje = album_valorado_id
    ? `Este álbum es muy similar a otro (${album_valorado_id}). Solo faltan ${nuevas.length} canciones nuevas por valorar.`
    : null;

  res.json({
    mensaje,
    nuevas,
    valoradas_en_otros_albumes: valoradasEnOtrosAlbumes // <-- para el frontend
  });
};

const obtenerAlbumClusters = async (req, res) => {
  const { album_id, grupo } = req.query;
  if (album_id) {
    const { data } = await supabase.from('album_clusters').select('*').eq('id_album', album_id).single();
    return res.json(data);
  }
  if (grupo) {
    const { data } = await supabase.from('albumes').select('*').in('id_album',
      (await supabase.from('album_clusters').select('id_album').eq('grupo', grupo)).data.map(a => a.id_album)
    );
    return res.json(data);
  }
  res.status(400).json({ error: 'Falta parámetro' });
};

const obtenerAlbumesClusters = async (req, res) => {
  const { offset = 0, limit = 1000 } = req.query;
  const { data, error } = await supabase
    .from('album_clusters')
    .select('id_album, grupo')
    .range(Number(offset), Number(offset) + Number(limit) - 1);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

/**
 * Normaliza el título de una canción para comparar versiones.
 */
function normalizarTituloCancion(titulo) {
  return (titulo || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(remaster(ed)?|deluxe|edition|bonus|live|demo|super|anniversary|expanded|complete|version|mix|radio edit|remix|original|mono|stereo|explicit|clean|instrumental|karaoke|single|ep|lp|box set|disc \d+|cd\d+|vinyl|digital|special|reissue|commentary)\b/gi, "")
    .replace(/(\bfeat\.?.*|\bft\.?.*|\bwith .*)/gi, "")
    .replace(/\b\d{2,4}\b/g, "")
    .replace(/[^\w\s\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Devuelve true si los títulos son muy similares y la duración es parecida.
 */
function esCancionSimilar(c1, c2) {
  const t1 = normalizarTituloCancion(c1.titulo);
  const t2 = normalizarTituloCancion(c2.titulo);
  const dur1 = c1.duracion_ms || 0;
  const dur2 = c2.duracion_ms || 0;
  // Similitud de título: Jaccard simple + substring
  const tokens1 = new Set(t1.split(" "));
  const tokens2 = new Set(t2.split(" "));
  const inter = [...tokens1].filter(x => tokens2.has(x)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccard = union ? inter / union : 0;
  const substring = t1 && t2 && (t1.includes(t2) || t2.includes(t1));
  // Duración: tolerancia 7 segundos
  const durOk = Math.abs(dur1 - dur2) < 7000;
  return (jaccard > 0.7 || substring) && durOk;
}

module.exports = { obtenerAlbumesClusters, obtenerAlbumClusters, crearAlbum, obtenerAlbumes, obtenerAlbumPorId, actualizarAlbum, eliminarAlbum, sugerirCancionesNuevasAlbum, sugerirAlbumSimilar };