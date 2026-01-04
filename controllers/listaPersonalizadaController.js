const supabase = require("../db");
const { uploadToSupabase } = require('./utils/supabaseUpload');

const verificarEntidadEnListas = async (req, res) => {
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
  try {
    const { userId, nombre_lista, tipo_lista, descripcion, privacidad } = req.body;
    let imagen = null;

    if (req.file) {
      imagen = req.file.filename;
    }

    const { data, error } = await supabase
      .from('listas_personalizadas')
      .insert([{
        usuario_id: userId,
        nombre_lista,
        tipo_lista,
        descripcion,
        privacidad,
        imagen
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Error al insertar en Supabase' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error en crearListaPersonalizada:', err);
    res.status(500).json({ error: 'Error inesperado al crear la lista' });
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
  let userId = req.query.userId || req.body.userId;

  if (userId === undefined || userId === 'undefined' || userId === '') {
    userId = null;
  }

  try {
    const { data: lista, error } = await supabase
      .from('listas_personalizadas')
      .select('*')
      .eq('id_lista', listaId)
      .single();

    if (error || !lista) throw error || new Error('Lista no encontrada');

    // Si la lista es pública, cualquiera puede verla
    if (lista.privacidad === 'publica') {
      return res.json(lista);
    }

    // Si es el dueño, puede verla siempre
    if (userId && String(lista.usuario_id) === String(userId)) {
      return res.json(lista);
    }

    // Si es colaborativa y el usuario es colaborador, puede verla y se le agrega el rol
    if (lista.privacidad === 'colaborativa' && userId) {
      const { data: colaborador } = await supabase
        .from('listas_colaboradores')
        .select('rol')
        .eq('lista_id', listaId)
        .eq('usuario_id', userId)
        .single();
      if (colaborador) {
        return res.json({ ...lista, rol_colaborador: colaborador.rol });
      }
    }

    // Si es privada y el usuario la tiene guardada, puede verla
    if (lista.privacidad === 'privada' && userId) {
      const { data: guardada, error: errorGuardada } = await supabase
        .from('listas_guardadas')
        .select('id')
        .eq('usuario_id', userId)
        .eq('lista_id', listaId);

      if (errorGuardada) throw errorGuardada;

      if (guardada && guardada.length > 0) {
        return res.json(lista);
      }
    }

    return res.status(403).json({ error: 'No tienes acceso a esta lista.' });

  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(404).json({ error: 'Error fetching list' });
  }
};

const obtenerListasPropiasYColaborativas = async (req, res) => {
  const { userId } = req.params;
  try {
    // Listas propias
    const { data: propias, error: errorPropias } = await supabase
      .from('listas_personalizadas')
      .select('*')
      .eq('usuario_id', userId);

    // Listas colaborativas
    const { data: colaborativas, error: errorColab } = await supabase
      .from('listas_colaboradores')
      .select('lista_id, rol, listas_personalizadas(*)')
      .eq('usuario_id', userId);

    const colaborativasListas = colaborativas.map(c => ({
      ...c.listas_personalizadas,
      rol_colaborador: c.rol
    }));

    res.json([
      ...propias,
      ...colaborativasListas
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener listas.' });
  }
};

const obtenerElementosDeLista = async (req, res) => {
  const { listaId } = req.params;
  const userId = req.query.userId; // Asegúrate de recibir el userId

  try {
    const { data: elementos, error: elementosError } = await supabase
      .from('elementos_lista_personalizada')
      .select('*')
      .eq('lista_id', listaId);

    if (elementosError) throw elementosError;

    const elementosConDetalles = await Promise.all(elementos.map(async (elemento) => {
      let detalles = null;

      try {
        switch (elemento.entidad_tipo) {
          case 'album': {
            // Primero obtenemos el álbum y sus artistas
            const { data: albumData } = await supabase
              .from('albumes')
              .select(`
                id_album,
                titulo,
                anio,
                foto_album,
                popularidad_album
              `)
              .eq('id_album', elemento.entidad_id)
              .single();

            // Obtenemos el artista principal del álbum
            const { data: artistaAlbum } = await supabase
              .from('album_artistas')
              .select('artistas(nombre_artista)')
              .eq('album_id', elemento.entidad_id)
              .limit(1)
              .single();

            // Obtenemos la valoración del usuario si existe
            const { data: valoracion } = await supabase
              .from('valoraciones_albumes')
              .select('calificacion')
              .eq('album', elemento.entidad_id)
              .eq('usuario', userId)
              .maybeSingle(); // Usar maybeSingle en lugar de single para evitar errores si no hay valoración

            detalles = {
              titulo: albumData.titulo,
              artista: artistaAlbum?.artistas?.nombre_artista,
              anio: albumData.anio,
              imagen: albumData.foto_album,
              popularidad: albumData.popularidad_album,
              calificacion_usuario: valoracion?.calificacion || null
            };
            break;
          }
          case 'artista': {
            const { data: artistaData } = await supabase
              .from('artistas')
              .select(`
                id_artista,
                nombre_artista,
                foto_artista,
                popularidad_artista
              `)
              .eq('id_artista', elemento.entidad_id)
              .single();

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
              calificacion_usuario: valoracion?.calificacion
};
            break;
          }
          case 'cancion': {
            const { data: cancionData } = await supabase
              .from('canciones')
              .select(`
                id_cancion,
                titulo,
                duracion_ms,
                popularidad,
                album
              `)
              .eq('id_cancion', elemento.entidad_id)
              .single();

            // Obtenemos el álbum para la carátula y el año
            const { data: albumData } = await supabase
              .from('albumes')
              .select('foto_album, anio')
              .eq('id_album', cancionData.album)
              .single();

            // Obtenemos el artista principal
            const { data: artistaCancion } = await supabase
              .from('cancion_artistas')
              .select('artistas(nombre_artista)')
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
              artista: artistaCancion?.artistas?.nombre_artista,
              duracion: Math.floor(cancionData.duracion_ms / 1000),
              imagen: albumData?.foto_album,
              anio: albumData?.anio,
              popularidad: cancionData.popularidad,
              calificacion_usuario: valoracion?.calificacion
};
            break;
          }
          case 'video': {
            const { data: videoData } = await supabase
              .from('videos_musicales')
              .select(`
                id_video,
                titulo,
                duracion,
                popularidad,
                miniatura,
                anio
              `)
              .eq('id_video', elemento.entidad_id)
              .single();

            // Obtenemos el artista principal
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
              artista: artistaVideo?.artistas?.nombre_artista,
              duracion: videoData.duracion,
              imagen: videoData.miniatura,
              anio: videoData.anio,
              popularidad: videoData.popularidad,
              calificacion_usuario: valoracion?.calificacion
};
            break;
          }
        }
      } catch (error) {
        console.error(`Error obteniendo detalles para ${elemento.entidad_tipo} ${elemento.entidad_id}:`, error);
        detalles = { error: 'No encontrado' };
      }

      return {
        ...elemento,
        detalles
      };
    }));

    res.status(200).json(elementosConDetalles);
  } catch (error) {
    console.error('Error al obtener elementos de lista personalizada:', error);
    res.status(500).json({ error: 'Error al obtener elementos de lista personalizada.' });
  }
};

const anadirAListaPersonalizada = async (req, res) => {
  const { userId, listaId, entidad_id, entidad_tipo } = req.body;

  // Verifica permisos
  const { data: lista, error: errorLista } = await supabase
    .from('listas_personalizadas')
    .select('usuario_id, privacidad')
    .eq('id_lista', listaId)
    .single();

  if (errorLista || !lista) throw errorLista || new Error('Lista no encontrada');

  let puedeAgregar = false;
  if (String(lista.usuario_id) === String(userId)) {
    puedeAgregar = true;
  } else if (lista.privacidad === 'colaborativa') {
    const { data: colaborador } = await supabase
      .from('listas_colaboradores')
      .select('rol')
      .eq('lista_id', listaId)
      .eq('usuario_id', userId)
      .single();
    if (colaborador && ['agregar', 'admin', 'eliminar'].includes(colaborador.rol)) {
      puedeAgregar = true;
    }
  }
  if (!puedeAgregar) {
    return res.status(403).json({ error: 'No tienes permiso para agregar entidades a esta lista.' });
  }

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
  const userId = req.query.userId || req.body.userId;

  try {
    // 1. Busca el elemento y la lista a la que pertenece
    const { data: elemento, error: errorElemento } = await supabase
      .from('elementos_lista_personalizada')
      .select('lista_id')
      .eq('id_elemento', elementoId)
      .single();
    if (errorElemento || !elemento) throw errorElemento || new Error('Elemento no encontrado');

    const listaId = elemento.lista_id;

    // 2. Busca la lista y verifica permisos
    const { data: lista, error: errorLista } = await supabase
      .from('listas_personalizadas')
      .select('usuario_id, privacidad')
      .eq('id_lista', listaId)
      .single();
    if (errorLista || !lista) throw errorLista || new Error('Lista no encontrada');

    let puedeEliminar = false;
    if (String(lista.usuario_id) === String(userId)) {
      puedeEliminar = true;
    } else if (lista.privacidad === 'colaborativa') {
      const { data: colaborador } = await supabase
        .from('listas_colaboradores')
        .select('rol')
        .eq('lista_id', listaId)
        .eq('usuario_id', userId)
        .single();
      if (colaborador && ['eliminar', 'admin'].includes(colaborador.rol)) {
        puedeEliminar = true;
      }
    }

    if (!puedeEliminar) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar entidades de esta lista.' });
    }

    // 3. Elimina el elemento
    const { error } = await supabase
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

  // Validar privacidad
  const opciones = ['publica', 'privada', 'colaborativa'];
  if (!opciones.includes(privacidad)) {
    return res.status(400).json({ error: 'Privacidad no válida.' });
  }

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
    // 1. Intenta insertar en listas_guardadas (evita duplicados)
    const { data: exists, error: existsError } = await supabase
      .from('listas_guardadas')
      .select('id')
      .eq('usuario_id', userId)
      .eq('lista_id', listaId);

    if (existsError) throw existsError;
    if (exists.length > 0) {
      return res.status(400).json({ error: 'Ya has guardado esta lista.' });
    }

    const { data, error } = await supabase
      .from('listas_guardadas')
      .insert([{ usuario_id: userId, lista_id: listaId }])
      .select();

    if (error) throw error;

    // 2. Actualiza el contador de guardados
    const { count, error: countError } = await supabase
      .from('listas_guardadas')
      .select('*', { count: 'exact', head: true })
      .eq('lista_id', listaId);

    if (countError) throw countError;

    await supabase
      .from('listas_personalizadas')
      .update({ saved_count: count })
      .eq('id_lista', listaId);

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error al guardar lista:', error);
    res.status(500).json({ error: 'Error al guardar lista.' });
  }
};

const eliminarListaGuardada = async (req, res) => {
  const { userId, listaId } = req.body;

  try {
    // Elimina de listas_guardadas
    const { error } = await supabase
      .from('listas_guardadas')
      .delete()
      .eq('usuario_id', userId)
      .eq('lista_id', listaId);

    if (error) throw error;

    // Actualiza el contador de guardados
    const { count, error: countError } = await supabase
      .from('listas_guardadas')
      .select('*', { count: 'exact', head: true })
      .eq('lista_id', listaId);

    if (countError) throw countError;

    await supabase
      .from('listas_personalizadas')
      .update({ saved_count: count })
      .eq('id_lista', listaId);

    res.status(200).json({ message: 'Lista eliminada de guardadas correctamente.' });
  } catch (error) {
    console.error('Error al eliminar lista guardada:', error);
    res.status(500).json({ error: 'Error al eliminar lista guardada.' });
  }
};

const verificarListaGuardada = async (req, res) => {
  const { userId, listaId } = req.body;
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

const obtenerListasGuardadas = async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('listas_guardadas')
      .select('lista_id, listas_personalizadas(*)')
      .eq('usuario_id', userId);

    if (error) throw error;

    // Devuelve solo los datos de la lista personalizada
    const listas = data.map(item => item.listas_personalizadas);
    res.json(listas);
  } catch (error) {
    console.error('Error al obtener listas guardadas:', error);
    res.status(500).json({ error: 'Error al obtener listas guardadas.' });
  }
};

const getProgresoListaPersonalizada = async (req, res) => {
  const { listaId, userId } = req.params;

  try {
    // 1. Obtén todos los elementos de la lista
    const { data: elementos, error: errorElementos } = await supabase
      .from('elementos_lista_personalizada')
      .select('id_elemento, entidad_id, entidad_tipo')
      .eq('lista_id', listaId);

    if (errorElementos) throw errorElementos;

    if (!elementos.length) return res.json({ progreso: 0, valorados: [] });

    // 2. Para cada tipo, busca los valorados por el usuario
    const valorados = new Set();

    // Canciones
    const cancionesIds = elementos.filter(e => e.entidad_tipo === 'cancion').map(e => e.entidad_id);
    if (cancionesIds.length) {
      const { data } = await supabase
        .from('valoraciones_canciones')
        .select('cancion')
        .eq('usuario', userId)
        .in('cancion', cancionesIds);
      data.forEach(v => valorados.add(`cancion-${v.cancion}`));
    }

    // Álbumes
    const albumesIds = elementos.filter(e => e.entidad_tipo === 'album').map(e => e.entidad_id);
    if (albumesIds.length) {
      const { data } = await supabase
        .from('valoraciones_albumes')
        .select('album')
        .eq('usuario', userId)
        .in('album', albumesIds);
      data.forEach(v => valorados.add(`album-${v.album}`));
    }

    // Artistas
    const artistasIds = elementos.filter(e => e.entidad_tipo === 'artista').map(e => e.entidad_id);
    if (artistasIds.length) {
      const { data } = await supabase
        .from('valoraciones_artistas')
        .select('artista')
        .eq('usuario', userId)
        .in('artista', artistasIds);
      data.forEach(v => valorados.add(`artista-${v.artista}`));
    }

    // Videos
    const videosIds = elementos.filter(e => e.entidad_tipo === 'video').map(e => e.entidad_id);
    if (videosIds.length) {
      const { data } = await supabase
        .from('valoraciones_videos_musicales')
        .select('video')
        .eq('usuario', userId)
        .in('video', videosIds);
      data.forEach(v => valorados.add(`video-${v.video}`));
    }

    // 3. Calcula el progreso
    const total = elementos.length;
    const valoradosCount = elementos.filter(e => valorados.has(`${e.entidad_tipo}-${e.entidad_id}`)).length;
    const progreso = total > 0 ? (valoradosCount / total) * 100 : 0;

    res.json({
      progreso,
      valorados: elementos.filter(e => valorados.has(`${e.entidad_tipo}-${e.entidad_id}`)).map(e => e.id_elemento)
    });
  } catch (error) {
    console.error('Error al calcular el progreso de la lista personalizada:', error);
    res.status(500).json({ error: 'Error al calcular el progreso de la lista personalizada.' });
  }
};

const obtenerListasColaborativas = async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('listas_colaboradores')
      .select('lista_id, listas_personalizadas(*)')
      .eq('usuario_id', userId);

    if (error) throw error;

    const listas = data.map(item => item.listas_personalizadas);
    res.json(listas);
  } catch (error) {
    console.error('Error al obtener listas colaborativas:', error);
    res.status(500).json({ error: 'Error al obtener listas colaborativas.' });
  }
};

// Obtener colaboradores de una lista
const obtenerColaboradores = async (req, res) => {
  const { listaId } = req.params;
  try {
    const { data, error } = await supabase
      .from('listas_colaboradores')
      .select('usuario_id, rol, usuarios(username)')
      .eq('lista_id', listaId);

    if (error) throw error;

    // Devuelve username y rol
    const colaboradores = data.map(c => ({
      usuario_id: c.usuario_id,
      rol: c.rol,
      username: c.usuarios?.username || ''
    }));

    res.json(colaboradores);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener colaboradores.' });
  }
};

// Agregar colaborador
const agregarColaborador = async (req, res) => {
  const { listaId } = req.params;
  const { username, rol } = req.body;
  try {
    // Busca el usuario por username
    const { data: user, error: errorUser } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('username', username)
      .single();
    if (errorUser || !user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // Inserta en listas_colaboradores
    const { error } = await supabase
      .from('listas_colaboradores')
      .insert([{ lista_id: listaId, usuario_id: user.id_usuario, rol }]);
    if (error) throw error;

    res.status(201).json({ message: 'Colaborador agregado.' });
  } catch (error) {
    console.error('Error al agregar colaborador:', error); // <-- AGREGA ESTE LOG
    res.status(500).json({ error: 'Error al agregar colaborador.' });
  }
};

// Cambiar rol de colaborador
const cambiarRolColaborador = async (req, res) => {
  const { listaId, usuarioId } = req.params;
  const { rol } = req.body;
  try {
    const { error } = await supabase
      .from('listas_colaboradores')
      .update({ rol })
      .eq('lista_id', listaId)
      .eq('usuario_id', usuarioId);
    if (error) throw error;
    res.json({ message: 'Rol actualizado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar el rol.' });
  }
};

// Eliminar colaborador
const eliminarColaborador = async (req, res) => {
  const { listaId, usuarioId } = req.params;
  try {
    const { error } = await supabase
      .from('listas_colaboradores')
      .delete()
      .eq('lista_id', listaId)
      .eq('usuario_id', usuarioId);
    if (error) throw error;
    res.json({ message: 'Colaborador eliminado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar colaborador.' });
  }
};

const buscarUsuarios = async (req, res) => {
  const { q } = req.query;
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id_usuario, username')
      .ilike('username', `%${q}%`)
      .limit(10);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error al buscar usuarios:', error); // <-- agrega este log
    res.status(500).json({ error: 'Error al buscar usuarios.' });
  }
};

const actualizarImagenLista = async (req, res) => {
  const { listaId } = req.params;
  try {
    let imagen = null;
    if (req.file) {
      if (req.file.size > 4 * 1024 * 1024) {
        return res.status(400).json({ error: 'La imagen no debe superar los 4MB.' });
      }
      imagen = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else {
      return res.status(400).json({ error: 'No se envió ninguna imagen.' });
    }
    // Actualiza la imagen en la base de datos
    const { data, error } = await supabase
      .from('listas_personalizadas')
      .update({ imagen })
      .eq('id_lista', listaId)
      .select();
    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error al actualizar imagen de la lista:', error);
    res.status(500).json({ error: 'Error al actualizar imagen de la lista.' });
  }
};

const obtenerListasDestacadasPorEntidad = async (req, res) => {
  const { entidad_id, entidad_tipo } = req.query;
  const { data, error } = await supabase
    .from('elementos_lista_personalizada')
    .select('lista_id, listas_personalizadas(*)')
    .eq('entidad_id', entidad_id)
    .eq('entidad_tipo', entidad_tipo)
    .limit(5);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(e => e.listas_personalizadas));
};

module.exports = {
  buscarUsuarios,
  actualizarImagenLista,
  obtenerListasPropiasYColaborativas,
  obtenerColaboradores,
  obtenerListasColaborativas,
  agregarColaborador,
  cambiarRolColaborador,
  eliminarColaborador,
  getProgresoListaPersonalizada,
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
  obtenerListasGuardadas,
  obtenerListasDestacadasPorEntidad,
};
