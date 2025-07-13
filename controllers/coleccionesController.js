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
  const userId = req.query.userId;
  const orderBy = req.query.orderBy;
  const orderDirection = req.query.orderDirection;
  let filterValorados = req.query.filterValorados;

  try {
    // 1. Obtener elementos base de la colección
    let elementosQuery = supabase
      .from('colecciones_elementos')
      .select('*')
      .eq('coleccion_id', id)
      .range(offset, offset + limit - 1);

    if (orderBy) {
      elementosQuery = elementosQuery.order(orderBy, { ascending: orderDirection === 'asc' });
    }

    const { data: elementos, error } = await elementosQuery;
    if (error) throw error;

    // 2. Obtener detalles de cada elemento
    const elementosConDetalles = await Promise.all(
      elementos.map(async (elemento) => {
        let detalles = null;

        try {
          switch (elemento.entidad_tipo) {
            case 'album': {
              const { data: albumData, error: albumError } = await supabase
                .from('albumes')
                .select('id_album,titulo,anio,foto_album,popularidad_album')
                .eq('id_album', elemento.entidad_id)
                .single();

              if (albumError || !albumData) {
                console.error(`Album no encontrado: ${elemento.entidad_id}`, albumError);
                break;
              }

              const { data: artistaData } = await supabase
                .from('album_artistas')
                .select('artistas!inner(id_artista,nombre_artista)')
                .eq('album_id', elemento.entidad_id)
                .limit(1)
                .single();

              const { data: valoracion } = await supabase
                .from('valoraciones_albumes')
                .select('calificacion')
                .eq('album', elemento.entidad_id)
                .eq('usuario', userId)
                .maybeSingle();

              detalles = {
                titulo: albumData.titulo,
                artista: artistaData?.artistas?.nombre_artista || null,
                anio: albumData.anio,
                imagen: albumData.foto_album, // verifica si existe en la base de datos
                popularidad: albumData.popularidad_album, // asegúrate que exista o usa el campo correcto
                calificacion_usuario: valoracion?.calificacion ?? null,
              };
              break;
            }
            case 'artista': {
              const { data: artistaData, error: artistaError } = await supabase
                .from('artistas')
                .select('id_artista,nombre_artista,foto_artista,popularidad_artista')
                .eq('id_artista', elemento.entidad_id)
                .single();

              if (artistaError || !artistaData) {
                console.error(`Artista no encontrado: ${elemento.entidad_id}`, artistaError);
                break;
              }

              const { data: valoracion } = await supabase
                .from('valoraciones_artistas')
                .select('calificacion')
                .eq('artista', elemento.entidad_id)
                .eq('usuario', userId)
                .maybeSingle();

              detalles = {
                nombre_artista: artistaData.nombre_artista,
                imagen: artistaData.foto_artista,
                popularidad: artistaData.popularidad_artista,
                calificacion_usuario: valoracion?.calificacion ?? null,
              };
              break;
            }
            case 'cancion': {
              const { data: cancionData, error: cancionError } = await supabase
                .from('canciones')
                .select(`
                  id_cancion,
                  titulo,
                  duracion_ms,
                  popularidad,
                  albumes!fk_album (
                    foto_album,
                    anio
                  )
                `)
                .eq('id_cancion', elemento.entidad_id)
                .single();

              if (cancionError || !cancionData) {
                console.error(`Cancion no encontrada: ${elemento.entidad_id}`, cancionError);
                break;
              }

              // Obtener artista principal
              const { data: artistaData } = await supabase
                .from('cancion_artistas')
                .select('artistas!inner(id_artista,nombre_artista)')
                .eq('cancion_id', elemento.entidad_id)
                .limit(1)
                .single();

              const { data: valoracion } = await supabase
                .from('valoraciones_canciones')
                .select('calificacion')
                .eq('cancion', elemento.entidad_id)
                .eq('usuario', userId)
                .maybeSingle();

              detalles = {
                titulo: cancionData.titulo,
                artista: artistaData?.artistas?.nombre_artista || null,
                duracion: Math.floor(cancionData.duracion_ms / 1000),
                imagen: cancionData.albumes?.foto_album || null,
                anio: cancionData.albumes?.anio || null,
                popularidad: cancionData.popularidad,
                calificacion_usuario: valoracion?.calificacion ?? null,
              };
              break;
            }
            case 'video': {
              const { data: videoData, error: videoError } = await supabase
                .from('videos_musicales')
                .select('id_video,titulo,duracion,popularidad,miniatura,anio')
                .eq('id_video', elemento.entidad_id)
                .single();

              if (videoError || !videoData) {
                console.error(`Video no encontrado: ${elemento.entidad_id}`, videoError);
                break;
              }

              const { data: artistaVideo } = await supabase
                .from('video_artistas')
                .select('artistas(nombre_artista)')
                .eq('video_id', elemento.entidad_id)
                .limit(1)
                .single();

              const { data: valoracion } = await supabase
                .from('valoraciones_videos_musicales')
                .select('calificacion')
                .eq('video', elemento.entidad_id)
                .eq('usuario', userId)
                .maybeSingle();

              detalles = {
                titulo: videoData.titulo,
                artista: artistaVideo?.artistas?.nombre_artista || null,
                duracion: videoData.duracion,
                imagen: videoData.miniatura,
                anio: videoData.anio,
                popularidad: videoData.popularidad,
                calificacion_usuario: valoracion?.calificacion ?? null,
              };
              break;
            }
            default:
              detalles = null;
          }
        } catch (error) {
          console.error(`Error obteniendo detalles para ${elemento.entidad_tipo} ${elemento.entidad_id}:`, error);
          detalles = { error: 'No encontrado' };
        }

        return {
          ...elemento,
          detalles,
        };
      })
    );

    // Filtro por valoraciones (filtra elementos con o sin calificación)
    let resultadoFiltrado = elementosConDetalles;
    if (filterValorados === 'true') {
      resultadoFiltrado = elementosConDetalles.filter(
        (el) => el.detalles?.calificacion_usuario != null
      );
    } else if (filterValorados === 'false') {
      resultadoFiltrado = elementosConDetalles.filter(
        (el) => el.detalles?.calificacion_usuario == null
      );
    }

    // Ordenar después de obtener detalles, si se pidió ordenar por calificación
    if (orderBy === 'calificacion') {
      resultadoFiltrado.sort((a, b) => {
        const calA = typeof a.detalles?.calificacion_usuario === 'number' ? a.detalles.calificacion_usuario : -1;
        const calB = typeof b.detalles?.calificacion_usuario === 'number' ? b.detalles.calificacion_usuario : -1;
        return orderDirection === 'asc' ? calA - calB : calB - calA;
      });
    }

    res.status(200).json(resultadoFiltrado);
  } catch (err) {
    console.error('Error al obtener elementos de la colección:', err);
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

module.exports = {
  getProgresoColeccion,
  getAllColecciones,
  getColeccionById,
  getColeccionesByUsuario,
  getColeccionElementos,
};