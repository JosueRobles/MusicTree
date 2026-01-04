const supabase = require('../config/db');

const registrarActividad = async (usuario_id, tipo_actividad, entidad_tipo, id_entidad) => {
  // Insertar en actividades_usuario (registro individual)
  const { error: errorIndividual } = await supabase
    .from('actividades_usuario')
    .insert([{ id_usuario: usuario_id, tipo_actividad, entidad_tipo, id_entidad }]);

  if (errorIndividual) {
    console.error("❌ Error al registrar actividad individual:", errorIndividual);
  }

  // Determinar el tipo de referencia (resumen)
  const referencia_entidad = tipo_actividad === 'seguimiento' ? 'usuario'
    : tipo_actividad === 'seguimiento_artista' ? 'artista'
    : entidad_tipo;

  // 🧹 Eliminar actividad previa si existe (para evitar duplicados)
  await supabase
    .from('actividad_usuario')
    .delete()
    .eq('usuario', usuario_id)
    .eq('tipo_actividad', tipo_actividad)
    .eq('referencia_id', id_entidad)
    .eq('referencia_entidad', referencia_entidad);

  // 📝 Insertar la nueva actividad
  const { error: errorResumen } = await supabase
    .from('actividad_usuario')
    .insert([{
      usuario: usuario_id,
      tipo_actividad,
      referencia_id: id_entidad,
      referencia_entidad,
      fecha: new Date()
    }]);

  if (errorResumen) {
    console.error("❌ Error al registrar actividad resumen:", errorResumen);
  }
};

module.exports = { registrarActividad };
