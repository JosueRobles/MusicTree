const supabase = require('../db');

// Obtener datos de una vista específica
const obtenerVista = async (req, res) => {
  const { vista } = req.params;

  try {
    // Validar que la vista solicitada sea válida
    const vistasValidas = ['vista_orden_predeterminado', 'vista_popularidad', 'vista_valoracion_promedio'];
    if (!vistasValidas.includes(vista)) {
      return res.status(400).json({ error: 'Vista no válida' });
    }

    // Consultar la vista en la base de datos
    const { data, error } = await supabase
      .from(vista)
      .select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error(`❌ Error al obtener datos de la vista ${vista}:`, error);
    res.status(500).json({ error: 'Error al obtener datos de la vista' });
  }
};

module.exports = {
  obtenerVista,
};