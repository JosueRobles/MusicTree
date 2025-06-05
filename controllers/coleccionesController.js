const supabase = require('../supabaseClient');

// Obtener todas las colecciones
const getAllColecciones = async (req, res) => {
  try {
    const { data, error } = await supabase.from('colecciones').select('*');
    if (error) throw error;

    // Verificar si se obtuvieron colecciones
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No hay colecciones disponibles.' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error al obtener colecciones:', err);
    res.status(500).json({ error: 'Error al obtener colecciones.' });
  }
};

// Obtener una colección específica por ID
const getColeccionById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('colecciones')
      .select('*')
      .eq('id_coleccion', id)
      .single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('Error al obtener la colección:', err);
    res.status(500).json({ error: 'Error al obtener la colección.' });
  }
};

// Obtener colecciones relacionadas con un usuario
const getColeccionesByUsuario = async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const { data, error } = await supabase
      .from('colecciones_usuario')
      .select('coleccion_id, progreso')
      .eq('usuario', usuarioId);
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('Error al obtener colecciones del usuario:', err);
    res.status(500).json({ error: 'Error al obtener colecciones del usuario.' });
  }
};

// Obtener elementos de una colección con soporte para paginación
const getColeccionElementos = async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 50; // Número máximo de elementos por página (default: 50)
  const offset = parseInt(req.query.offset) || 0; // Desplazamiento (default: 0)

  try {
    const { data, error } = await supabase
      .from('colecciones_elementos')
      .select('*')
      .eq('coleccion_id', id)
      .range(offset, offset + limit - 1); // Seleccionar el rango de elementos

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Error al obtener elementos de la colección:', err);
    res.status(500).json({ error: 'Error al obtener elementos de la colección.' });
  }
};

// Obtener el progreso del usuario en una colección
const getProgresoColeccion = async (req, res) => {
  const { coleccionId, usuarioId } = req.params;

  try {
    // Llamar a la función almacenada en PostgreSQL
    const { data, error } = await supabase.rpc('calcular_progreso_usuario', {
      coleccion_id: parseInt(coleccionId),
      usuario_id: parseInt(usuarioId),
    });

    if (error) {
      console.error('Error al ejecutar la función calcular_progreso_usuario:', error);
      return res.status(500).json({ error: 'Error al obtener el progreso del usuario.' });
    }

    // Si no hay datos, devolver 0 como progreso
    const progreso = data.length > 0 && data[0]?.progreso !== null ? data[0].progreso : 0;

    res.status(200).json({ progreso });
  } catch (err) {
    console.error('Error al obtener el progreso del usuario:', err);
    res.status(500).json({ error: 'Error al obtener el progreso del usuario.' });
  }
};

module.exports = {
  getProgresoColeccion,
  getAllColecciones,
  getColeccionById,
  getColeccionesByUsuario,
  getColeccionElementos,
};