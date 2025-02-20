const supabase = require("../db");

const crearValoracion = async (req, res) => {
  const { usuario_id, calificacion, comentario, entidad_tipo, entidad_id, recomendable } = req.body;
  try {
    let tabla;
    switch (entidad_tipo) {
      case 'cancion':
        tabla = 'valoraciones_canciones';
        break;
      case 'album':
        tabla = 'valoraciones_albumes';
        break;
      case 'artista':
        tabla = 'valoraciones_artistas';
        break;
      default:
        return res.status(400).json({ error: "Tipo de entidad no válida" });
    }

    const { data, error } = await supabase
      .from(tabla)
      .insert([{ usuario_id, entidad_id, calificacion, comentario, recomendable }])
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerValoraciones = async (req, res) => {
  try {
    const { data, error } = await supabase.from('valoraciones').select('*');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener valoraciones:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerValoracionPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('valoraciones')
      .select('*')
      .eq('ID_valoracion', id)
      .single();

    if (error) return res.status(404).json({ error: "Valoración no encontrada" });

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarValoracion = async (req, res) => {
  const { id } = req.params;
  const { calificacion, comentario, recomendable } = req.body;
  try {
    const { data, error } = await supabase
      .from('valoraciones')
      .update({ calificacion, comentario, recomendable })
      .eq('ID_valoracion', id)
      .single();

    if (error) return res.status(404).json({ error: "Valoración no encontrada" });

    res.json(data);
  } catch (error) {
    console.error("❌ Error al actualizar la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarValoracion = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('valoraciones')
      .delete()
      .eq('ID_valoracion', id)
      .single();

    if (error) return res.status(404).json({ error: "Valoración no encontrada" });

    res.json({ message: "Valoración eliminada con éxito" });
  } catch (error) {
    console.error("❌ Error al eliminar la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { crearValoracion, obtenerValoraciones, obtenerValoracionPorId, actualizarValoracion, eliminarValoracion };