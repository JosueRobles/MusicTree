const supabase = require("../db");

const crearLista = async (req, res) => {
  const { usuario, nombre, descripcion, tipo_lista } = req.body;
  try {
    const { data, error } = await supabase
      .from('listas_comunidad')
      .insert([{ usuario, nombre, descripcion, tipo_lista }])
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear la lista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerListas = async (req, res) => {
  try {
    const { data, error } = await supabase.from('listas_comunidad').select('*');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener listas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerListaPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('listas_comunidad')
      .select('*')
      .eq('ID_lista', id)
      .single();

    if (error) return res.status(404).json({ error: "Lista no encontrada" });

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener la lista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarLista = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, tipo_lista } = req.body;
  try {
    const { data, error } = await supabase
      .from('listas_comunidad')
      .update({ nombre, descripcion, tipo_lista })
      .eq('ID_lista', id)
      .single();

    if (error) return res.status(404).json({ error: "Lista no encontrada" });

    res.json(data);
  } catch (error) {
    console.error("❌ Error al actualizar la lista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarLista = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('listas_comunidad')
      .delete()
      .eq('ID_lista', id)
      .single();

    if (error) return res.status(404).json({ error: "Lista no encontrada" });

    res.json({ message: "Lista eliminada con éxito" });
  } catch (error) {
    console.error("❌ Error al eliminar la lista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { crearLista, obtenerListas, obtenerListaPorId, actualizarLista, eliminarLista };