const supabase = require('../db');
const axios = require('axios');

const MICROSERVICIO_URL = process.env.MICROSERVICIO_URL || 'http://localhost:8000';

const exportAlbumesForML = async (req, res) => {
  const { offset = 0, limit = 1000 } = req.query;
  const { data, error } = await supabase
    .from('albumes')
    .select(`
      id_album,
      titulo,
      anio,
      foto_album,
      numero_canciones,
      tipo_album,
      popularidad_album,
      categoria,
      album_artistas(artista_id),
      album_generos(genero_id, subgeneros)
    `)
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const guardarFeedbackML = async (req, res) => {
  const { usuario_id, entidad_tipo, entidad_id_1, entidad_id_2, es_duplicado, confianza_modelo } = req.body;
  const { error } = await supabase
    .from('ml_feedback')
    .insert([{ usuario_id, entidad_tipo, entidad_id_1, entidad_id_2, es_duplicado, confianza_modelo, fecha: new Date() }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

const getClusterGrupo = async (req, res) => {
  // Solo recibe :id, asume entidad = 'album'
  const { id } = req.params;
  const { data, error } = await supabase
    .from('album_clusters')
    .select('grupo')
    .eq('id_album', id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'No se encontró grupo' });
  res.json({ grupo: data.grupo });
};

const getClusterMiembros = async (req, res) => {
  // Solo recibe :grupo, asume entidad = 'album'
  const { grupo } = req.params;
  const { data, error } = await supabase
    .from('album_clusters')
    .select('id_album')
    .eq('grupo', grupo);
  if (error || !data) return res.status(404).json({ error: 'No se encontraron miembros' });
  res.json([...new Set(data.map(d => d.id_album))]);
};

const sugerirSimilares = async (req, res) => {
  const { id_album } = req.params;
  const { data, error } = await supabase
    .from('albumes_similares')
    .select(`
      album_id_similar: id_album,
      titulo,
      anio,
      foto_album,
      numero_canciones,
      tipo_album,
      popularidad_album,
      categoria,
      album_artistas(artista_id),
      album_generos(genero_id, subgeneros)
    `)
    .eq('id_album', id_album);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const sugerirSimilaresCancion = async (id_cancion) => {
  const { data, error } = await supabase
    .from('canciones_similares')
    .select('id_cancion2')
    .eq('id_cancion1', id_cancion);
  if (error) throw error;
  return data;
};

module.exports = {
  exportAlbumesForML,
  guardarFeedbackML,
  getClusterGrupo,
  getClusterMiembros,
  sugerirSimilares,
  sugerirSimilaresCancion,
};