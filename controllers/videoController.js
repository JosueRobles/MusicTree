const supabase = require("../db");
const { notificarNuevosLanzamientos } = require('./utils/notifyHelpers');
const axios = require('axios');

const crearVideoMusical = async (req, res) => {
  const { titulo, album_id, url_video, duracion, artistas } = req.body;

  try {
    const miniatura = obtenerMiniaturaYouTube(url_video);
    
    const { data, error } = await supabase
      .from("videos_musicales")
      .insert([{ titulo, album_id, url_video, duracion, miniatura }])
      .single();

    if (error) throw error;

    // Relacionar el video con los artistas
    for (const artista_id of artistas) {
      const { error: videoArtistaError } = await supabase
        .from("video_artistas")
        .insert([{ video_id: data.id_video, artista_id }]);

      if (videoArtistaError) throw videoArtistaError;
    }

    // Notificar a los artistas sobre el nuevo lanzamiento
    for (const artista_id of artistas) {
      await notificarNuevosLanzamientos(
        artista_id,
        'video',
        data.id_video,
        `¡Nuevo video de ${titulo}!`
      );
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear video musical:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerVideosMusicales = async (req, res) => {
  const { termino } = req.query;
  let query = supabase.from('videos_musicales').select('*');
  if (termino) query = query.ilike('titulo', `%${termino}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const obtenerVideoMusicalPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('videos_musicales')
      .select('*')
      .eq('id_video', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Video musical no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener video musical:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarVideoMusical = async (req, res) => {
  const { id } = req.params;
  const { titulo, album_id, url_video, duracion, artistas } = req.body;

  try {
    const { data, error } = await supabase
      .from('videos_musicales')
      .update({ titulo, album_id, url_video, duracion })
      .eq('id_video', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Video musical no encontrado" });
    }

    // Actualizar la relación con los artistas
    await supabase
      .from('video_artistas')
      .delete()
      .eq('video_id', id);

    for (const artista_id of artistas) {
      const { error: videoArtistaError } = await supabase
        .from('video_artistas')
        .insert([{ video_id: id, artista_id }]);

      if (videoArtistaError) throw videoArtistaError;
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error al actualizar video musical:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarVideoMusical = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('videos_musicales')
      .delete()
      .eq('id_video', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Video musical no encontrado" });
    }

    res.json({ message: "Video musical eliminado con éxito" });
  } catch (error) {
    console.error("❌ Error al eliminar video musical:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerVideosDeArtista = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('video_artistas')
      .select('videos_musicales (id_video, titulo, url_video, duracion, popularidad)')
      .eq('artista_id', id);

    if (error) throw error;

    res.status(200).json({ videos: data.map(item => item.videos_musicales) });
  } catch (error) {
    console.error("❌ Error al obtener videos del artista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const sugerirCancionEnVideo = async (req, res) => {
  const { usuario_id, id_video } = req.query;
  const { data: emb } = await supabase.from('video_embeddings').select('embedding').eq('id_video', id_video).single();
  if (!emb) return res.json({ mensaje: null, canciones: [] });

  // Buscar canciones similares
  const similares = await axios.post('http://localhost:8000/similares', { entidad: 'cancion', id: id_video, embedding: emb.embedding });
  // Filtra el propio id_video si existe como canción
  const similaresFiltrados = similares.data.filter(s => s.id !== parseInt(id_video));
  const { data: clusters } = await supabase.from('cancion_clusters').select('id_cancion, grupo');
  const clusterMap = Object.fromEntries(clusters.map(c => [c.id_cancion, c.grupo]));
  const { data: valoradas } = await supabase.from('valoraciones_canciones').select('cancion').eq('usuario', usuario_id);
  const valoradasIds = valoradas.map(v => v.cancion);
  const valoradasClusters = new Set(valoradasIds.map(id => clusterMap[id]).filter(Boolean));
  let mensaje = null;
  // Si el usuario valoró alguna canción del grupo de los similares
  const yaValorada = similaresFiltrados.find(s => valoradasClusters.has(clusterMap[s.id]));
  if (yaValorada) {
    mensaje = `Este video musical contiene una canción que ya valoraste.`;
  }
  res.json({ mensaje, canciones: similaresFiltrados });
};

module.exports = { crearVideoMusical, obtenerVideosMusicales, obtenerVideoMusicalPorId, actualizarVideoMusical, eliminarVideoMusical, obtenerVideosDeArtista, sugerirCancionEnVideo };