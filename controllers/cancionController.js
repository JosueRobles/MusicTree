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

module.exports = { crearCancion, obtenerCanciones, obtenerCancionPorId, actualizarCancion, eliminarCancion, reportarNoMusical };