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
      .from('vista_progreso_colecciones')
      .select('id_coleccion, progreso')
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('Error al obtener progreso de colecciones del usuario:', err);
    res.status(500).json({ error: 'Error al obtener progreso de colecciones del usuario.' });
  }
};

const getColeccionElementos = async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const orderBy = req.query.orderBy;
  const orderDirection = req.query.orderDirection?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  const filterValorados = req.query.filterValorados; // 'true' | 'false' | undefined

  try {
    // 1. Tipo de colección
    const { data: coleccion, error: errorColeccion } = await supabase
      .from('colecciones')
      .select('tipo_coleccion')
      .eq('id_coleccion', id)
      .single();

    if (errorColeccion || !coleccion) {
      return res.status(404).json({ error: 'Colección no encontrada.' });
    }

    let vista = '';
    const tipo = (coleccion.tipo_coleccion || '').toLowerCase();
    if (tipo.includes('cancion')) vista = 'vista_coleccion_canciones';
    else if (tipo.includes('album')) vista = 'vista_coleccion_albumes';
    else if (tipo.includes('artista')) vista = 'vista_coleccion_artistas';
    else if (tipo.includes('video')) vista = 'vista_coleccion_videos';
    else return res.status(400).json({ error: `Tipo de colección no soportado: ${coleccion.tipo_coleccion}` });

    // 2. Query base
    let query = supabase
      .from(vista)
      .select('*')
      .eq('coleccion_id', id);

    // 3. Filtro por valorados
    if (filterValorados === 'true') {
      query = query.eq('valorado', true);
    } else if (filterValorados === 'false' || filterValorados === 'pendientes') {
      query = query.eq('valorado', false);
    }

    // 4. Ordenamiento
    if (orderBy && orderBy !== 'predeterminada') {
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    } else if (tipo.includes('cancion') || tipo.includes('album')) {
      query = query.order('orden', { ascending: true });
    } else {
      query = query.order('id_elemento', { ascending: true });
    }

    // 5. Paginación
    query = query.range(offset, offset + limit - 1);

    const { data: elementos, error } = await query;
    if (error) throw error;

    res.status(200).json(elementos);
  } catch (err) {
    console.error('Error en getColeccionElementos:', err);
    res.status(500).json({ error: 'Error al obtener elementos de la colección.' });
  }
};

// Obtener el progreso del usuario en una colección
const getProgresoColeccion = async (req, res) => {
  const { coleccionId, usuarioId } = req.params;
  if (!coleccionId || !usuarioId || isNaN(parseInt(coleccionId)) || isNaN(parseInt(usuarioId))) {
  return res.status(400).json({ error: 'Parámetros inválidos.' });
}

  try {
    // 1. Llama a la función de progreso
    const { data, error } = await supabase.rpc('calcular_progreso_usuario', {
      coleccion_id: parseInt(coleccionId),
      usuario_id: parseInt(usuarioId),
    });

    if (error) {
      console.error('Error al ejecutar la función calcular_progreso_usuario:', error);
      return res.status(500).json({ error: 'Error al obtener el progreso del usuario.' });
    }

    const progreso = data.length > 0 && data[0]?.progreso !== null ? data[0].progreso : 0;

    // 2. Obtén el tipo de colección
    const { data: coleccion, error: errorColeccion } = await supabase
      .from('colecciones')
      .select('tipo_coleccion')
      .eq('id_coleccion', coleccionId)
      .single();

    if (errorColeccion || !coleccion) {
      return res.status(404).json({ error: 'Colección no encontrada.' });
    }

    // 3. Obtén los elementos de la colección
    const { data: elementos, error: errorElementos } = await supabase
      .from('colecciones_elementos')
      .select('id_elemento, entidad_id')
      .eq('coleccion_id', coleccionId);

    if (errorElementos) {
      return res.status(500).json({ error: 'Error al obtener elementos de la colección.' });
    }

    // 4. Según el tipo, busca los valorados por el usuario
    let tablaValoraciones = '';
    let campoEntidad = '';
    // 4. Según el tipo, busca los valorados por el usuario
    let tipo = (coleccion.tipo_coleccion || '').toLowerCase();
    if (tipo === 'cancion' || tipo === 'canciones') {
      tablaValoraciones = 'valoraciones_canciones';
      campoEntidad = 'cancion';
    } else if (tipo === 'album' || tipo === 'álbum' || tipo === 'albumes' || tipo === 'álbumes') {
      tablaValoraciones = 'valoraciones_albumes';
      campoEntidad = 'album';
    } else if (tipo === 'artista' || tipo === 'artistas') {
      tablaValoraciones = 'valoraciones_artistas';
      campoEntidad = 'artista';
    } else if (tipo === 'video' || tipo === 'videos' || tipo === 'video musical' || tipo === 'videos musicales') {
      tablaValoraciones = 'valoraciones_videos_musicales';
      campoEntidad = 'video';
    } else {
      return res.status(400).json({ error: `Tipo de colección no soportado: ${coleccion.tipo_coleccion}` });
    }
    // 5. Obtén los ids de entidad valorados por el usuario
    const { data: valorados, error: errorValorados } = await supabase
      .from(tablaValoraciones)
      .select(campoEntidad)
      .eq('usuario', usuarioId);

    if (errorValorados) {
      return res.status(500).json({ error: 'Error al obtener valoraciones del usuario.' });
    }

    const idsValorados = (valorados || []).map(v => v[campoEntidad]);

    // 6. Devuelve los id_elemento de la colección que han sido valorados
    const elementosValorados = elementos
      .filter(e => idsValorados.includes(e.entidad_id))
      .map(e => e.id_elemento);

    res.status(200).json({
      progreso,
      valorados: elementosValorados
    });
  } catch (err) {
    console.error('Error al obtener el progreso del usuario:', err);
    res.status(500).json({ error: 'Error al obtener el progreso del usuario.' });
  }
};

// Contar elementos de una colección
const getColeccionElementosCount = async (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId;
  let filterValorados = req.query.filterValorados;

  try {
    let elementosQuery = supabase
      .from('colecciones_elementos')
      .select('id_elemento, entidad_id')
      .eq('coleccion_id', id);

    const { data: elementos, error } = await elementosQuery;
    if (error) throw error;

    // Si hay filtro de valorados, filtra aquí
    let total = elementos.length;
    if (filterValorados !== undefined && userId) {
      // Determina tipo de colección
      const { data: coleccion } = await supabase
        .from('colecciones')
        .select('tipo_coleccion')
        .eq('id_coleccion', id)
        .single();
      let tablaValoraciones = '';
      let campoEntidad = '';
      let tipo = (coleccion.tipo_coleccion || '').toLowerCase();
      if (tipo === 'cancion' || tipo === 'canciones') {
        tablaValoraciones = 'valoraciones_canciones';
        campoEntidad = 'cancion';
      } else if (tipo === 'album' || tipo === 'álbum' || tipo === 'albumes' || tipo === 'álbumes') {
        tablaValoraciones = 'valoraciones_albumes';
        campoEntidad = 'album';
      } else if (tipo === 'artista' || tipo === 'artistas') {
        tablaValoraciones = 'valoraciones_artistas';
        campoEntidad = 'artista';
      } else if (tipo === 'video' || tipo === 'videos' || tipo === 'video musical' || tipo === 'videos musicales') {
        tablaValoraciones = 'valoraciones_videos_musicales';
        campoEntidad = 'video';
      }
      const { data: valorados } = await supabase
        .from(tablaValoraciones)
        .select(campoEntidad)
        .eq('usuario', userId);
      const idsValorados = (valorados || []).map(v => v[campoEntidad]);
      if (filterValorados === 'true') {
        total = elementos.filter(e => idsValorados.includes(e.entidad_id)).length;
      } else if (filterValorados === 'false') {
        total = elementos.filter(e => !idsValorados.includes(e.entidad_id)).length;
      }
    }
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: 'Error al contar elementos.' });
  }
};

module.exports = {
  getProgresoColeccion,
  getAllColecciones,
  getColeccionById,
  getColeccionesByUsuario,
  getColeccionElementos,
  getColeccionElementosCount,
};