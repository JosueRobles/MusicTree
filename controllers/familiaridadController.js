const supabase = require("../db");

// Agregar o actualizar familiaridad
const agregarFamiliaridad = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, nivel } = req.body;
  try {
    // Elimina la familiaridad previa del usuario para esa entidad
    await supabase
      .from('familiaridad')
      .delete()
      .eq('usuario', usuario)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    // Inserta la nueva familiaridad
    const { data, error } = await supabase
      .from('familiaridad')
      .insert([{ usuario, entidad_tipo, entidad_id, nivel }])
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ mensaje: "Familiaridad agregada correctamente", data });
  } catch (error) {
    res.status(500).json({ error: "Error al agregar familiaridad" });
  }
};

// Obtener familiaridad de un usuario para una entidad
const obtenerFamiliaridad = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.query;
  try {
    const { data, error } = await supabase
      .from('familiaridad')
      .select('*')
      .eq('usuario', usuario)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.status(200).json(data || {});
  } catch (error) {
    res.status(500).json({ error: "Error al obtener familiaridad" });
  }
};

// Contar familiaridad por nivel para una entidad
const contarFamiliaridad = async (req, res) => {
  const { entidad_tipo, entidad_id } = req.query;
  try {
    const { data, error } = await supabase
      .from('familiaridad')
      .select('nivel')
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (error) throw error;

    // Agrupa y cuenta en JS
    const counts = {};
    (data || []).forEach(item => {
      if (item.nivel) {
        counts[item.nivel] = (counts[item.nivel] || 0) + 1;
      }
    });

    // Devuelve como array [{nivel: ..., count: ...}]
    const result = Object.entries(counts).map(([nivel, count]) => ({ nivel, count }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Error al contar familiaridad" });
  }
};

module.exports = { agregarFamiliaridad, obtenerFamiliaridad, contarFamiliaridad };