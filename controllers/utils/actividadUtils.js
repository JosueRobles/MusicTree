const supabase = require('../config/db');

const registrarActividad = async (usuario_id, tipo_actividad, entidad_tipo, id_entidad) => {
  // Insertar en actividades_usuario (registro individual)
  const { error: errorIndividual } = await supabase
    .from('actividades_usuario')
    .insert([{ id_usuario: usuario_id, tipo_actividad, entidad_tipo, id_entidad }]);

  if (errorIndividual) {
    console.error("❌ Error al registrar actividad individual:", errorIndividual);
  }

  // Insertar en actividad_usuario (resumen)
  const referencia_entidad = tipo_actividad === 'seguimiento' ? 'usuario'
    : tipo_actividad === 'seguimiento_artista' ? 'artista'
    : entidad_tipo;
  const { error: errorResumen } = await supabase
    .from('actividad_usuario')
    .insert([{ usuario: usuario_id, tipo_actividad, referencia_id: id_entidad, referencia_entidad }]);

  if (errorResumen) {
    console.error("❌ Error al registrar actividad resumen:", errorResumen);
  }
};



module.exports = { registrarActividad };
