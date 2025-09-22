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

// Obtener progreso y desbloquear insignias
const obtenerProgresoYDesbloquear = async (req, res) => {
  const { userId } = req.params;
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ error: 'userId requerido y debe ser numérico.' });
  }
  try {
    // 1. Consulta la vista de progreso
    const { data: progreso, error } = await supabase
      .from('vista_progreso_insignias')
      .select('*')
      .eq('id_usuario', userId);

    if (error) {
      console.error('Error consultando vista_progreso_insignias:', error);
      throw error;
    }

    // 2. Consulta insignias ya obtenidas
    const { data: obtenidasData, error: error2 } = await supabase
      .from('insignias_usuario')
      .select('*')
      .eq('usuario', userId);

    if (error2) {
      console.error('Error consultando insignias_usuario:', error2);
      throw error2;
    }

    // Convertir a Map para acceso rápido
    const obtenidas = new Map();
    for (const ins of obtenidasData || []) {
      obtenidas.set(String(ins.insignia_id), ins);
    }
    // Tracking de nuevas insignias desbloqueadas
    const nuevasInsignias = [];

    // 3. Inserta nuevas insignias si progreso >= 100 y no la tiene
    for (const prog of progreso || []) {
      if (prog.progreso >= 100 && !obtenidas.has(String(prog.id_insignia))) {
        // Añade fecha actual para poder ordenar por fecha posteriormente
        const fechaActual = new Date();

        const { data: insertResult, error: insertError } = await supabase
          .from('insignias_usuario')
          .insert([{
            usuario: userId,
            insignia_id: prog.id_insignia,
            fecha: fechaActual.toISOString(),
            progreso: 100
          }])
          .select();

        if (insertError) {
          console.error('Error al insertar insignia:', insertError);
          continue;
        }

        // Notificación para el usuario
        const { error: notifError } = await supabase
          .from('notificaciones')
          .insert([{
            usuario_id: userId,
            tipo_notificacion: 'insignia_obtenida',
            entidad_tipo: 'insignia',
            entidad_id: prog.id_insignia,
            mensaje: `¡Has obtenido la insignia "${prog.nombre}"!`,
            visto: false,
            registrado: fechaActual.toISOString()
          }]);

        if (notifError) {
          console.error('Error al crear notificación:', notifError);
        } else {
          nuevasInsignias.push({
            id_insignia: prog.id_insignia,
            nombre: prog.nombre,
            descripcion: prog.descripcion,
            icono: prog.icono
          });
        }
      } else if (prog.progreso >= 100 && obtenidas.has(String(prog.id_insignia))) {
        // Ya tiene la insignia, actualizar si es necesario
        const insigniaUsuario = obtenidas.get(String(prog.id_insignia));

        // Si no tiene la fecha actualizada o el progreso no es 100
        if (!insigniaUsuario.fecha || insigniaUsuario.progreso !== 100) {
          await supabase
            .from('insignias_usuario')
            .update({
              progreso: 100,
              fecha: insigniaUsuario.fecha || new Date().toISOString()
            })
            .eq('id', insigniaUsuario.id);
        }
      } else if (prog.progreso < 100 && obtenidas.has(String(prog.id_insignia))) {
        // Tiene la insignia pero su progreso bajó (raro, pero posible)
        const insigniaUsuario = obtenidas.get(String(prog.id_insignia));

        // Solo actualizar el progreso, mantener la fecha
        if (insigniaUsuario.progreso !== prog.progreso) {
          await supabase
            .from('insignias_usuario')
            .update({ progreso: prog.progreso })
            .eq('id', insigniaUsuario.id);
        }
      } else if (
        prog.progreso < 100 &&
        !obtenidas.has(String(prog.id_insignia)) &&
        prog.progreso > 0 // Solo si el usuario ha hecho algo
      ) {
        await supabase
          .from('insignias_usuario')
          .insert([{
            usuario: userId,
            insignia_id: prog.id_insignia,
            progreso: prog.progreso
          }]);
      }
    }

    // Obtener la lista completa y actualizada de progreso
    const { data: progresoActualizado, error: error3 } = await supabase
      .from('insignias_usuario')
      .select('*, insignias(*)')
      .eq('usuario', userId);

    if (error3) {
      console.error('Error obteniendo progreso actualizado:', error3);
      throw error3;
    }

    // Incluye información sobre las nuevas insignias en la respuesta
    res.status(200).json(progresoActualizado || []);
  } catch (error) {
    console.error('Error en progreso/desbloqueo de insignias:', error);
    res.status(500).json({ error: 'Error en progreso/desbloqueo de insignias.' });
  }
};

// Obtener una insignia específica por ID
const obtenerInsigniaPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('insignias')
      .select('*')
      .eq('id_insignia', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Insignia no encontrada.' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener insignia por ID:', error);
    res.status(500).json({ error: 'Error al obtener insignia por ID.' });
  }
};

module.exports = {
  obtenerInsignias,
  obtenerInsigniasUsuario,
  crearInsignia,
  eliminarInsignia,
  obtenerProgresoYDesbloquear,
  obtenerInsigniaPorId,
};

