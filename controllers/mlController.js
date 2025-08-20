const supabase = require('../db');
const axios = require('axios');

// Exporta datos de canciones para ML
const exportCancionesForML = async (req, res) => {
  const { offset = 0, limit = 1000 } = req.query;
  const { data, error } = await supabase
    .from('canciones')
    .select(`
      id_cancion,
      titulo,
      duracion_ms,
      album:fk_album(titulo),
      orden,
      spotify_id,
      categoria,
      cancion_artistas(artista_id)
    `)
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

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

const exportVideosForML = async (req, res) => {
  const { offset = 0, limit = 1000 } = req.query;
  const { data, error } = await supabase
    .from('videos_musicales')
    .select(`
      id_video,
      titulo,
      url_video,
      duracion,
      popularidad,
      miniatura,
      anio,
      youtube_id,
      video_artistas(artista_id),
      video_generos(genero_id, subgeneros)
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

// Devuelve canciones similares por embedding
const sugerirSimilares = async (req, res) => {
  const { entidad, id } = req.params;

  let tablaEmbeddings;
  if(entidad === 'cancion') tablaEmbeddings = 'cancion_embeddings';
  else if(entidad === 'album') tablaEmbeddings = 'album_embeddings';
  else if(entidad === 'video') tablaEmbeddings = 'video_embeddings';
  else return res.status(400).json({ error: 'Entidad no válida' });

  const { data: emb, error: embError } = await supabase
    .from(tablaEmbeddings)
    .select('embedding')
    .eq(`id_${entidad}`, id)
    .single();

  if(embError || !emb) return res.status(404).json({ error: 'Embedding no encontrado' });

  // Llamada al microservicio Python para calcular similitud
  const similares = await obtenerSimilaresDesdePython(entidad, id, emb.embedding);

  res.json({ similares });
};

async function obtenerSimilaresDesdePython(entidad, id, embedding) {
  try {
    const { data } = await axios.post('http://localhost:8000/similares', {
      entidad,
      id,
      embedding
    });
    return data;
  } catch (err) {
    console.error("Error llamando al microservicio de similitud:", err.message);
    return [];
  }
}

const getClusterGrupo = async (req, res) => {
  const { entidad, id } = req.params;
  let table;
  if (entidad === 'cancion') table = 'cancion_clusters';
  else if (entidad === 'album') table = 'album_clusters';
  else if (entidad === 'video') table = 'video_clusters';
  else if (entidad === 'artista') return res.status(404).json({ error: 'No hay clusters para artistas' });
  else return res.status(400).json({ error: 'Entidad no válida' });

  const { data, error } = await supabase
    .from(table)
    .select('grupo')
    .eq(`id_${entidad}`, id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'No se encontró grupo' });
  res.json({ grupo: data.grupo });
};

const getClusterMiembros = async (req, res) => {
  const { entidad, grupo } = req.params;
  let table, id_field;
  if (entidad === 'cancion') { table = 'cancion_clusters'; id_field = 'id_cancion'; }
  else if (entidad === 'album') { table = 'album_clusters'; id_field = 'id_album'; }
  else if (entidad === 'video') { table = 'video_clusters'; id_field = 'id_video'; }
  else return res.status(400).json({ error: 'Entidad no válida' });

  const { data, error } = await supabase
    .from(table)
    .select(id_field)
    .eq('grupo', grupo);
  if (error || !data) return res.status(404).json({ error: 'No se encontraron miembros' });
  res.json([...new Set(data.map(d => d[id_field]))]);
};

module.exports = {
  exportCancionesForML,
  exportAlbumesForML,
  exportVideosForML,
  sugerirSimilares,
  guardarFeedbackML,
  getClusterGrupo,
  getClusterMiembros
};