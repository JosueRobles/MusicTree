const supabase = require("../db");

const crearVideoMusical = async (req, res) => {
  const { titulo, artista_id, album_id, url_video, duracion } = req.body;

  try {
    const { data, error } = await supabase
      .from('videos_musicales')
      .insert([{ titulo, artista_id, album_id, url_video, duracion }])
      .single();

    if (error) throw error;
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
      .eq('ID_video', id)
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
  const { titulo, artista_id, album_id, url_video, duracion } = req.body;

  try {
    const { data, error } = await supabase
      .from('videos_musicales')
      .update({ titulo, artista_id, album_id, url_video, duracion })
      .eq('ID_video', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Video musical no encontrado" });
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
      .eq('ID_video', id)
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

module.exports = { crearVideoMusical, obtenerVideosMusicales, obtenerVideoMusicalPorId, actualizarVideoMusical, eliminarVideoMusical };