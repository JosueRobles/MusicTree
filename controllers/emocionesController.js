const supabase = require("../db");

const agregarEmocion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, emocion } = req.body;

  try {
    const { data, error } = await supabase
      .from('emociones')
      .insert([{ usuario, entidad_tipo, entidad_id, emocion }], { upsert: true }); // Usamos upsert para evitar duplicados

    if (error) throw error;

    res.status(200).json({ mensaje: "Emoción agregada correctamente", data });
  } catch (error) {
    console.error("❌ Error al agregar la emoción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarEmocion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.body;

  try {
    const { error } = await supabase
      .from('emociones')
      .delete()
      .eq('usuario', usuario)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (error) throw error;

    res.status(200).json({ mensaje: "Emoción eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar la emoción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const modificarEmocion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, emocion } = req.body;

  try {
    await eliminarEmocion(req, res); // Primero eliminamos la emoción existente
    await agregarEmocion(req, res);  // Luego agregamos la nueva emoción
  } catch (error) {
    console.error("❌ Error al modificar la emoción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { agregarEmocion, eliminarEmocion, modificarEmocion };