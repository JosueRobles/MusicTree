const supabase = require("../db");
const { notificarNuevosLanzamientos } = require('./utils/notifyHelpers');
const axios = require('axios');

const MICROSERVICIO_URL = process.env.MICROSERVICIO_URL || 'http://localhost:8000';

const crearCancion = async (req, res) => {
  const { titulo, album_id, orden, duracion_segundos } = req.body;

  try {
    const { data, error } = await supabase
      .from('canciones')
      .insert([{ titulo, album_id, orden, duracion_segundos }])
      .single();

    if (error) throw error;

    // Notificar a los artistas sobre el nuevo lanzamiento
    if (data && data.id_cancion && album_id) {
      const { data: albumArtistas } = await supabase.from('album_artistas').select('artista_id').eq('album_id', album_id);
      for (const artista of (albumArtistas || [])) {
        await notificarNuevosLanzamientos(
          artista.artista_id,
          'cancion',
          data.id_cancion,
          `¡Nueva canción en álbum de ${titulo}!`
        );
      }
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerCanciones = async (req, res) => {
    const { termino } = req.query;
    let query = supabase.from('canciones').select('*');
    if (termino) query = query.ilike('titulo', `%${termino}%`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

const obtenerCancionPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('canciones')
      .select(`
        id_cancion,
        titulo,
        duracion_ms,
        popularidad,
        categoria,
        album:fk_album (
          id_album,
          titulo,
          anio,
          foto_album
        )
      `)
      .eq('id_cancion', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Canción no encontrada" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarCancion = async (req, res) => {
  const { id } = req.params;
  const { titulo, album_id, orden, duracion_segundos } = req.body;

  try {
    const { data, error } = await supabase
      .from('canciones')
      .update({ titulo, album_id, orden, duracion_segundos })
      .eq('id_cancion', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Canción no encontrada" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error al actualizar canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarCancion = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('canciones')
      .delete()
      .eq('id_cancion', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Canción no encontrada" });
    }

    res.json({ message: "Canción eliminada con éxito" });
  } catch (error) {
    console.error("❌ Error al eliminar canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const sugerirCancionDuplicada = async (req, res) => {
  const { usuario_id, id_cancion } = req.query;
  const { data: emb } = await supabase.from('cancion_embeddings').select('embedding').eq('id_cancion', id_cancion).single();
  if (!emb) return res.json({ mensaje: null, duplicados: [] });

  // Buscar canciones similares
  const similares = await axios.post(`${MICROSERVICIO_URL}/similares`, { entidad: 'cancion', id: id_cancion, embedding: emb.embedding });
  // Filtra el propio id
  const similaresFiltrados = similares.data.filter(s => s.id !== parseInt(id_cancion));
  const { data: clusterActual } = await supabase.from('cancion_clusters').select('grupo').eq('id_cancion', id_cancion).single();
  const grupoActual = clusterActual?.grupo;
  const { data: clusters } = await supabase.from('cancion_clusters').select('id_cancion, grupo');
  const clusterMap = Object.fromEntries(clusters.map(c => [c.id_cancion, c.grupo]));
  const { data: valoradas } = await supabase.from('valoraciones_canciones').select('cancion').eq('usuario', usuario_id);
  const valoradasIds = valoradas.map(v => v.cancion);
  const valoradasClusters = new Set(valoradasIds.map(id => clusterMap[id]).filter(Boolean));
  let mensaje = null;
  // Solo muestra mensaje si el usuario valoró otra canción del mismo grupo (no la actual)
  if (
    grupoActual &&
    valoradasClusters.has(grupoActual) &&
    !valoradasIds.includes(parseInt(id_cancion))
  ) {
    mensaje = `Esta canción parece una versión duplicada de otra que ya valoraste. ¿Quieres contarla como nueva?`;
  }
  res.json({ mensaje, duplicados: similaresFiltrados });
};

const reportarNoMusical = async (req, res) => {
  const { usuario_id, id_cancion, es_no_musical, comentario } = req.body;
  // Actualiza la canción
  await supabase
    .from('canciones')
    .update({ es_no_musical })
    .eq('id_cancion', id_cancion);

  // Guarda el feedback
  await supabase
    .from('ml_feedback')
    .insert([{
      usuario_id,
      entidad_tipo: 'cancion',
      entidad_id_1: id_cancion,
      entidad_id_2: null,
      es_duplicado: null,
      confianza_modelo: null,
      comentario,
      fecha: new Date()
    }]);
  res.json({ success: true });
};

const obtenerCancionClusters = async (req, res) => {
  const { cancion_id, grupo } = req.query;
  if (cancion_id) {
    const { data } = await supabase.from('cancion_clusters').select('*').eq('id_cancion', cancion_id).single();
    return res.json(data);
  }
  if (grupo) {
    const { data } = await supabase.from('canciones').select('*').in('id_cancion',
      (await supabase.from('cancion_clusters').select('id_cancion').eq('grupo', grupo)).data.map(a => a.id_cancion)
    );
    return res.json(data);
  }
  res.status(400).json({ error: 'Falta parámetro' });
};

const obtenerCancionesClusters = async (req, res) => {
  const { offset = 0, limit = 1000 } = req.query;
  const { data, error } = await supabase
    .from('cancion_clusters')
    .select('id_cancion, grupo')
    .range(Number(offset), Number(offset) + Number(limit) - 1);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { obtenerCancionesClusters, obtenerCancionClusters, crearCancion, obtenerCanciones, obtenerCancionPorId, actualizarCancion, eliminarCancion, sugerirCancionDuplicada, reportarNoMusical };