const supabase = require("../db");

const verificarEntidadEnListas = async (req, res) => {
  console.log("Cuerpo recibido:", req.body); // Verifica el cuerpo
  const { userId, entidad_id, entidad_tipo } = req.body;

  try {
    const { data: listasData, error: listasError } = await supabase
      .from('listas_personalizadas')
      .select('id_lista')
      .eq('usuario_id', userId);

    if (listasError) throw listasError;

    const listaIds = listasData.map(lista => lista.id_lista);

    const { data, error } = await supabase
      .from('elementos_lista_personalizada')
      .select('id_elemento')
      .eq('entidad_id', entidad_id)
      .eq('entidad_tipo', entidad_tipo)
      .in('lista_id', listaIds);

    if (error) throw error;

    res.status(200).json({ exists: data.length > 0 });
  } catch (error) {
    console.error('Error al verificar entidad en listas:', error);
    res.status(500).json({ error: 'Error al verificar entidad en listas.' });
  }
};

const crearListaPersonalizada = async (req, res) => {
  const { userId, nombre_lista, tipo_lista, descripcion, privacidad } = req.body;

  // Validar que el nombre de la lista y el tipo de lista no estén vacíos
  if (!nombre_lista || !tipo_lista) {
    return res.status(400).json({ error: 'El nombre de la lista y el tipo de lista son obligatorios.' });
  }

  try {
    const { data, error } = await supabase
      .from('listas_personalizadas')
      .insert([{ usuario_id: userId, nombre_lista, tipo_lista, descripcion, privacidad }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error al crear lista personalizada:', error);
    res.status(500).json({ error: 'Error al crear lista personalizada.' });
  }
};

const obtenerListasPersonalizadas = async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('listas_personalizadas')
      .select('*')
      .eq('usuario_id', userId);

    if (error) {
      console.error("Error en la consulta a Supabase:", error); // Verifica el error
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener listas personalizadas:', error);
    res.status(500).json({ error: 'Error al obtener listas personalizadas.' });
  }
};

const obtenerListaPersonalizadaPorId = async (req, res) => {
  const { listaId } = req.params;
  const { userId } = req.query;

  try {
    const { data: listaData, error: listaError } = await supabase
      .from('listas_personalizadas')
      .select('*')
      .eq('id_lista', listaId)
      .single();

    if (listaError) throw listaError;

    // Verificar privacidad
    if (listaData.privacidad === 'privada' && listaData.usuario_id !== parseInt(userId, 10)) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta lista.' });
    }

    res.status(200).json(listaData);
  } catch (error) {
    console.error('Error al obtener lista personalizada:', error);
    res.status(500).json({ error: 'Error al obtener lista personalizada.' });
  }
};

const obtenerElementosDeLista = async (req, res) => {
  const { listaId } = req.params;

  try {
    const { data, error } = await supabase
      .from('elementos_lista_personalizada')
      .select('*')
      .eq('lista_id', listaId);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener elementos de lista personalizada:', error);
    res.status500.json({ error: 'Error al obtener elementos de lista personalizada.' });
  }
};

const anadirAListaPersonalizada = async (req, res) => {
  const { userId, listaId, entidad_id, entidad_tipo } = req.body;

  try {
    // Verificar si la entidad ya está en la lista especificada
    const { data: existsData, error: existsError } = await supabase
      .from('elementos_lista_personalizada')
      .select('id_elemento')
      .eq('entidad_id', entidad_id)
      .eq('entidad_tipo', entidad_tipo)
      .eq('lista_id', listaId);

    if (existsError) throw existsError;

    if (existsData.length > 0) {
      return res.status(400).json({ error: 'La entidad ya existe en esta lista.' });
    }

    // Insertar la nueva entidad en la lista
    const { data, error } = await supabase
      .from('elementos_lista_personalizada')
      .insert([{ lista_id: listaId, entidad_id, entidad_tipo }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error al añadir a lista personalizada:', error);
    res.status(500).json({ error: 'Error al añadir a lista personalizada.' });
  }
};

const eliminarListaPersonalizada = async (req, res) => {
  const { listaId } = req.params;

  try {
    const { data, error } = await supabase
      .from('listas_personalizadas')
      .delete()
      .eq('id_lista', listaId);

    if (error) throw error;

    res.status(200).json({ message: 'Lista personalizada eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar lista personalizada:', error);
    res.status(500).json({ error: 'Error al eliminar lista personalizada.' });
  }
};

const eliminarElementoDeLista = async (req, res) => {
  const { elementoId } = req.params;

  try {
    const { data, error } = await supabase
      .from('elementos_lista_personalizada')
      .delete()
      .eq('id_elemento', elementoId);

    if (error) throw error;

    res.status(200).json({ message: 'Elemento eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar elemento de lista personalizada:', error);
    res.status(500).json({ error: 'Error al eliminar elemento de lista personalizada.' });
  }
};

const cambiarPrivacidad = async (req, res) => {
  const { listaId } = req.params;
  const { privacidad } = req.body;

  try {
    const { data, error } = await supabase
      .from('listas_personalizadas')
      .update({ privacidad })
      .eq('id_lista', listaId)
      .select();

    if (error) throw error;

    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error al cambiar la privacidad:', error);
    res.status(500).json({ error: 'Error al cambiar la privacidad.' });
  }
};

const guardarLista = async (req, res) => {
  const { userId, listaId } = req.body;

  try {
    // Incrementar el contador de popularidad
    const { data: lista, error: listaError } = await supabase
      .from('listas_personalizadas')
      .update({ saved_count: supabase.raw('saved_count + 1') })
      .eq('id_lista', listaId)
      .select()
      .single();

    if (listaError) throw listaError;

    // Guardar la lista en listas_guardadas
    const { data, error } = await supabase
      .from('listas_guardadas')
      .insert([{ usuario_id: userId, lista_id: listaId }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error al guardar lista:', error);
    res.status(500).json({ error: 'Error al guardar lista.' });
  }
};

const eliminarListaGuardada = async (req, res) => {
  const { userId, listaId } = req.body;

  try {
    // Decrementar el contador de popularidad
    const { data: lista, error: listaError } = await supabase
      .from('listas_personalizadas')
      .update({ saved_count: supabase.raw('saved_count - 1') })
      .eq('id_lista', listaId)
      .select()
      .single();

    if (listaError) throw listaError;

    // Eliminar la lista de listas_guardadas
    const { data, error } = await supabase
      .from('listas_guardadas')
      .delete()
      .eq('usuario_id', userId)
      .eq('lista_id', listaId);

    if (error) throw error;

    res.status(200).json({ message: 'Lista eliminada de guardadas correctamente.' });
  } catch (error) {
    console.error('Error al eliminar lista guardada:', error);
    res.status(500).json({ error: 'Error al eliminar lista guardada.' });
  }
};

const verificarListaGuardada = async (req, res) => {
  const { userId, listaId } = req.query;

  try {
    const { data, error } = await supabase
      .from('listas_guardadas')
      .select('*')
      .eq('usuario_id', userId)
      .eq('lista_id', listaId);

    if (error) throw error;

    res.status(200).json({ guardada: data.length > 0 });
  } catch (error) {
    console.error('Error al verificar lista guardada:', error);
    res.status(500).json({ error: 'Error al verificar lista guardada.' });
  }
};

const invitarColaborador = async (req, res) => {
  const { listaId, usuarioId, rol } = req.body;

  try {
    const { data, error } = await supabase
      .from('listas_colaboradores')
      .insert([{ lista_id: listaId, usuario_id: usuarioId, rol }]);

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error al invitar colaborador:', error);
    res.status(500).json({ error: 'Error al invitar colaborador.' });
  }
};

module.exports = {
  invitarColaborador,
  crearListaPersonalizada,
  obtenerListasPersonalizadas,
  obtenerListaPersonalizadaPorId,
  obtenerElementosDeLista,
  anadirAListaPersonalizada,
  eliminarListaPersonalizada,
  eliminarElementoDeLista,
  verificarEntidadEnListas,
  guardarLista,
  cambiarPrivacidad,
  eliminarListaGuardada,
  verificarListaGuardada,
};