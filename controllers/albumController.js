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
  // 1. Obtén canciones del álbum
  const { data: cancionesAlbum } = await supabase
    .from('canciones')
    .select('id_cancion')
    .eq('album', id_album);
  // 2. Obtén valoraciones del usuario
  const { data: valoradas } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuario_id);
  const valoradasIds = valoradas.map(v => v.cancion);
  // 3. Filtra las no valoradas
  const nuevas = cancionesAlbum.filter(c => !valoradasIds.includes(c.id_cancion));
  res.json({ nuevas });
};

const sugerirAlbumSimilar = async (req, res) => {
  const { usuario_id, id_album } = req.query;
  const { data: emb } = await supabase.from('album_embeddings').select('embedding').eq('id_album', id_album).single();
  if (!emb) return res.json({ mensaje: null, nuevas: [] });

  // Buscar álbumes similares
  const similares = await axios.post('http://localhost:8000/similares', { entidad: 'album', id: id_album, embedding: emb.embedding });
  // Filtra el propio álbum
  const similaresFiltrados = similares.data.filter(a => a.id !== parseInt(id_album));
  if (!similaresFiltrados.length) return res.json({ mensaje: null, nuevas: [] });

  // Tomar el álbum más similar (que no sea el mismo)
  const album_similar_id = similaresFiltrados[0].id;
  const { data: canciones_actual } = await supabase.from('canciones').select('id_cancion, titulo').eq('album', id_album);
  const { data: clusters } = await supabase.from('cancion_clusters').select('id_cancion, grupo');
  const clusterMap = Object.fromEntries(clusters.map(c => [c.id_cancion, c.grupo]));
  const { data: valoradas } = await supabase.from('valoraciones_canciones').select('cancion').eq('usuario', usuario_id);
  const valoradasIds = valoradas.map(v => v.cancion);
  const valoradasClusters = new Set(valoradasIds.map(id => clusterMap[id]).filter(Boolean));
  let nuevas = canciones_actual.filter(song => {
    const grupo = clusterMap[song.id_cancion];
    return grupo && !valoradasClusters.has(grupo);
  });
  const mensaje = `Este álbum es muy similar a otro (${album_similar_id}). Solo faltan ${nuevas.length} canciones nuevas por valorar.`;
  res.json({ mensaje, nuevas });
};

module.exports = { crearAlbum, obtenerAlbumes, obtenerAlbumPorId, actualizarAlbum, eliminarAlbum, sugerirCancionesNuevasAlbum, sugerirAlbumSimilar };