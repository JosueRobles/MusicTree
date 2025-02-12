const supabase = require("../db");

const crearCancion = async (req, res) => {
  const { titulo, album_id, orden, duracion_segundos } = req.body;

  try {
    const { data, error } = await supabase
      .from('canciones')
      .insert([{ titulo, album_id, orden, duracion_segundos }])
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerCanciones = async (req, res) => {
  try {
    const { data, error } = await supabase.from('canciones').select('*');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener canciones:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerCancionPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('canciones')
      .select('*')
      .eq('ID_cancion', id)
      .single();

    if (error) {
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
      .eq('ID_cancion', id)
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
      .eq('ID_cancion', id)
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

module.exports = { crearCancion, obtenerCanciones, obtenerCancionPorId, actualizarCancion, eliminarCancion };