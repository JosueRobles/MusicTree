const supabase = require('../db');

// Obtener todas las insignias
const obtenerInsignias = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('insignias')
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener insignias:', error);
    res.status(500).json({ error: 'Error al obtener insignias.' });
  }
};

// Obtener insignias de un usuario
const obtenerInsigniasUsuario = async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('insignias_usuario')
      .select('*, insignias(*)')
      .eq('usuario', userId);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener insignias del usuario:', error);
    res.status(500).json({ error: 'Error al obtener insignias del usuario.' });
  }
};

// Crear nueva insignia
const crearInsignia = async (req, res) => {
  const { nombre, descripcion, criterio, icono } = req.body;

  try {
    const { data, error } = await supabase
      .from('insignias')
      .insert([{ nombre, descripcion, criterio, icono }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error al crear insignia:', error);
    res.status(500).json({ error: 'Error al crear insignia.' });
  }
};

// Eliminar insignia
const eliminarInsignia = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('insignias')
      .delete()
      .eq('id_insignia', id);

    if (error) throw error;

    res.status(200).json({ mensaje: 'Insignia eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar insignia:', error);
    res.status(500).json({ error: 'Error al eliminar insignia.' });
  }
};

module.exports = {
  obtenerInsignias,
  obtenerInsigniasUsuario,
  crearInsignia,
  eliminarInsignia,
};