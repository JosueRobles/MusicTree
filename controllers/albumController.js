const supabase = require("../db");
const { notificarNuevosLanzamientos } = require('./utils/notifyHelpers');
const axios = require('axios');

const crearAlbum = async (req, res) => {
  const { titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album } = req.body;

  try {
    const { data, error } = await supabase
      .from('albumes')
      .insert([{ titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album }])
      .single();

    if (error) throw error;

    // Notificar sobre el nuevo lanzamiento
    if (data && data.id_album && artista_id) {
      await notificarNuevosLanzamientos(
        artista_id,
        'album',
        data.id_album,
        `¡Nuevo álbum de ${titulo}!`
      );
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerAlbumes = async (req, res) => {
    const { termino } = req.query;
    let query = supabase.from('albumes').select('*');
    if (termino) query = query.ilike('titulo', `%${termino}%`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

const obtenerAlbumPorId = async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener información del álbum
    const { data: album, error: albumError } = await supabase
      .from('albumes')
      .select('*')
      .eq('id_album', id)
      .single();
    
    if (albumError) {
      console.error("Error al obtener álbum:", albumError);
      return res.status(404).json({ error: "Álbum no encontrado" });
    }
    
    // El frontend espera esta estructura de respuesta específica,
    // así que asegúrate de mantenerla
    res.json({ 
      album,
      // No incluimos canciones aquí porque el frontend las obtiene por separado
    });
    
  } catch (error) {
    console.error("❌ Error al obtener álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarAlbum = async (req, res) => {
  const { id } = req.params;
  const { titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album } = req.body;

  try {
    const { data, error } = await supabase
      .from('albumes')
      .update({ titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album })
      .eq('id_album', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error al actualizar álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarAlbum = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('albumes')
      .delete()
      .eq('id_album', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    res.json({ message: "Álbum eliminado con éxito" });
  } catch (error) {
    console.error("❌ Error al eliminar álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const sugerirCancionesNuevasAlbum = async (req, res) => {
  const { usuario_id, id_album } = req.query;

  // 1. Canciones del álbum
  const { data: cancionesAlbum, error: errorAlbum } = await supabase
    .from('canciones')
    .select('id_cancion')
    .eq('album', id_album);

  if (errorAlbum) {
    console.error("Error consultando canciones:", errorAlbum);
    return res.status(500).json({ error: "Error obteniendo canciones" });
  }

  // 2. Canciones valoradas por el usuario
  const { data: valoradas, error: errorVal } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuario_id);

  if (errorVal) {
    console.error("Error consultando valoraciones:", errorVal);
    return res.status(500).json({ error: "Error obteniendo valoraciones" });
  }

  // Si no hay valoradas, que sea []
  const valoradasIds = (valoradas || []).map(v => v.cancion);

  // 3. Expandir por clusters
  let idsClusters = [];
  if (valoradasIds.length > 0) {
    // 3.1 Traer grupos de las canciones valoradas
    const { data: gruposData, error: errorGrupos } = await supabase
      .from('cancion_clusters')
      .select('grupo')
      .in('id_cancion', valoradasIds);

    if (errorGrupos) {
      console.error("Error consultando grupos:", errorGrupos);
      return res.status(500).json({ error: "Error obteniendo clusters" });
    }

    const grupos = (gruposData || []).map(g => g.grupo);

    // 3.2 Traer todos los miembros de esos grupos
    if (grupos.length > 0) {
      const { data: clusters, error: errorClusters } = await supabase
        .from('cancion_clusters')
        .select('id_cancion')
        .in('grupo', grupos);

      if (errorClusters) {
        console.error("Error consultando miembros de clusters:", errorClusters);
        return res.status(500).json({ error: "Error obteniendo miembros de clusters" });
      }

      idsClusters = (clusters || []).map(c => c.id_cancion);
    }
  }
  // 4. Unión: valoradas directas + sus similares
  const todasValoradas = new Set([...valoradasIds, ...idsClusters]);

  // 5. Filtrar canciones del álbum que no están en ese set
  const nuevas = cancionesAlbum.filter(c => !todasValoradas.has(c.id_cancion));

  res.json({ nuevas });
};

const sugerirAlbumSimilar = async (req, res) => {
  const { usuario_id, id_album } = req.query;

  // 1. Canciones del álbum actual
  const { data: cancionesAlbum, error: errorAlbum } = await supabase
    .from('canciones')
    .select('id_cancion, titulo')
    .eq('album', id_album);

  if (errorAlbum) {
    console.error("Error consultando canciones:", errorAlbum);
    return res.status(500).json({ error: "Error obteniendo canciones" });
  }

  // 2. Canciones valoradas por el usuario
  const { data: valoradasCancion, error: errorVal } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuario_id);

  if (errorVal) {
    console.error("Error consultando valoraciones:", errorVal);
    return res.status(500).json({ error: "Error obteniendo valoraciones" });
  }

  const valoradasIds = (valoradasCancion || []).map(v => v.cancion);

  // 3. Expandir por clusters
  let idsClusters = [];
  if (valoradasIds.length > 0) {
    // 3.1 Traer grupos de las canciones valoradas
    const { data: gruposData } = await supabase
      .from('cancion_clusters')
      .select('grupo')
      .in('id_cancion', valoradasIds);

    const grupos = (gruposData || []).map(g => g.grupo);

    // 3.2 Traer todos los miembros de esos grupos
    if (grupos.length > 0) {
      const { data: clusters } = await supabase
        .from('cancion_clusters')
        .select('id_cancion')
        .in('grupo', grupos);

      idsClusters = (clusters || []).map(c => c.id_cancion);
    }
  }

  // 4. Unión: valoradas directas + sus similares
  const todasValoradas = new Set([...valoradasIds, ...idsClusters]);

  // 5. Filtrar canciones del álbum que no están en ese set
  const nuevas = cancionesAlbum.filter(c => !todasValoradas.has(c.id_cancion));
  if (!nuevas.length) return res.json({ mensaje: null, nuevas: [] });

  // 6. Obtener cluster del álbum y todos los miembros del grupo
  const { data: clusterData } = await supabase
    .from('album_clusters')
    .select('grupo')
    .eq('id_album', id_album)
    .single();
  if (!clusterData) return res.json({ mensaje: null, nuevas });

  const grupo = clusterData.grupo;

  const { data: miembrosGrupo } = await supabase
    .from('album_clusters')
    .select('id_album')
    .eq('grupo', grupo);
  const idsGrupo = miembrosGrupo.map(a => a.id_album);

  // 7. Revisar cuál álbum del grupo ya valoró el usuario
  const { data: valoradasAlbum } = await supabase
    .from('valoraciones_albumes')
    .select('album')
    .eq('usuario', usuario_id);
  const valoradasAlbumIds = valoradasAlbum.map(v => v.album);

  const album_valorado_id = idsGrupo.find(id => valoradasAlbumIds.includes(id));

  // 8. Mensaje final
  const mensaje = album_valorado_id
    ? `Este álbum es muy similar a otro (${album_valorado_id}). Solo faltan ${nuevas.length} canciones nuevas por valorar.`
    : null;

  res.json({ mensaje, nuevas });
};

const obtenerAlbumClusters = async (req, res) => {
  const { album_id, grupo } = req.query;
  if (album_id) {
    const { data } = await supabase.from('album_clusters').select('*').eq('id_album', album_id).single();
    return res.json(data);
  }
  if (grupo) {
    const { data } = await supabase.from('albumes').select('*').in('id_album',
      (await supabase.from('album_clusters').select('id_album').eq('grupo', grupo)).data.map(a => a.id_album)
    );
    return res.json(data);
  }
  res.status(400).json({ error: 'Falta parámetro' });
};

module.exports = { obtenerAlbumClusters, crearAlbum, obtenerAlbumes, obtenerAlbumPorId, actualizarAlbum, eliminarAlbum, sugerirCancionesNuevasAlbum, sugerirAlbumSimilar };