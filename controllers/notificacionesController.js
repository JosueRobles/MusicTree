const supabase = require('../db');

// Crear notificación para un usuario
const crearNotificacion = async (req, res) => {
  const { usuario_id, tipo_notificacion, entidad_tipo, entidad_id, mensaje } = req.body;

  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .insert([{ usuario_id, tipo_notificacion, entidad_tipo, entidad_id, mensaje, visto: false }]);

    if (error) throw error;

    res.status(201).json({ mensaje: 'Notificación creada exitosamente.', data });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error al crear notificación.' });
  }
};

// Obtener notificaciones de un usuario
const obtenerNotificaciones = async (req, res) => {
  const { usuarioId } = req.params;

  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('registrado', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones.' });
  }
};

// Marcar una notificación como vista
const marcarNotificacionComoVista = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({ visto: true })
      .eq('id_notificacion', id);

    if (error) throw error;

    res.status(200).json({ mensaje: 'Notificación marcada como vista.' });
  } catch (error) {
    console.error('Error al marcar notificación como vista:', error);
    res.status(500).json({ error: 'Error al marcar notificación como vista.' });
  }
};

module.exports = {
  crearNotificacion,
  obtenerNotificaciones,
  marcarNotificacionComoVista,
};