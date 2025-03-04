const supabase = require("../db");

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

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear video musical:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerVideosMusicales = async (req, res) => {
  try {
    const { data, error } = await supabase.from('videos_musicales').select('*');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener videos musicales:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
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

module.exports = { crearVideoMusical, obtenerVideosMusicales, obtenerVideoMusicalPorId, actualizarVideoMusical, eliminarVideoMusical, obtenerVideosDeArtista };