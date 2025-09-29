const supabase = require('../supabaseClient');
const { registrarActividad } = require('./utils/actividadUtils');
const { esCancionSimilar } = require('./albumController');

const getCatalogosByUsuario = async (req, res) => {
  const { usuarioId } = req.params;
  try {
    // Trae progreso de la vista
    const { data, error } = await supabase
      .from('vista_progreso_catalogos')
      .select('id_artista, nombre_artista, foto_artista, progreso, es_principal')
      .eq('usuario_id', usuarioId);

    if (error) throw error;

    // Trae valoraciones del usuario
    const [valsAlb, valsCan, valsVid] = await Promise.all([
      supabase.from('valoraciones_albumes').select('album').eq('usuario', usuarioId),
      supabase.from('valoraciones_canciones').select('cancion').eq('usuario', usuarioId),
      supabase.from('valoraciones_videos_musicales').select('video').eq('usuario', usuarioId),
    ]);
    const valorados = new Set([
      ...(valsAlb.data || []).map(v => v.album),
      ...(valsCan.data || []).map(v => v.cancion),
      ...(valsVid.data || []).map(v => v.video),
    ]);

    // Solo muestra progreso si valoró al menos una entidad de ese artista
    // Devuelve todos los catálogos principales, aunque el progreso sea 0
    const resultado = data; // <-- Quita el filtro por progreso

    res.status(200).json(resultado);
  } catch (err) {
    console.error('Error al obtener progreso de catálogos:', err);
    res.status(500).json({ error: 'Error al obtener progreso de catálogos.' });
  }
};

const seguirArtistaCatalogo = async (req, res) => {
  const { usuario_id, artista_id } = req.body;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: 'Faltan datos.' });

  // Permitir array de artista_id
  const artistas = Array.isArray(artista_id) ? artista_id : [artista_id];

  try {
    let nuevos = 0;
    for (const id of artistas) {
      // Verifica si ya existe
      const { data: existente } = await supabase
        .from('seguimiento_artistas')
        .select('id')
        .eq('usuario_id', usuario_id)
        .eq('artista_id', id)
        .single();

      if (!existente) {
        const { error } = await supabase
          .from('seguimiento_artistas')
          .insert([{ usuario_id, artista_id: id }]);
        if (error) throw error;
        nuevos++;
        await registrarActividad(usuario_id, 'seguimiento_artista', 'artista', id);
      }
    }
    res.status(201).json({ message: `Ahora sigues a ${nuevos} artista(s).` });
  } catch (err) {
    res.status(500).json({ error: 'Error al seguir artista.' });
  }
};

const getArtistasSeguidos = async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const { data, error } = await supabase
      .from('seguimiento_artistas')
      .select('artista_id, artistas(nombre_artista, foto_artista)')
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    res.status(200).json(data.map(a => ({
      id_artista: a.artista_id,
      nombre_artista: a.artistas.nombre_artista,
      foto_artista: a.artistas.foto_artista
    })));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener artistas seguidos.' });
  }
};

const dejarDeSeguirArtista = async (req, res) => {
  const { usuario_id, artista_id } = req.body;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: 'Faltan datos.' });

  try {
    const { error } = await supabase
      .from('seguimiento_artistas')
      .delete()
      .eq('usuario_id', usuario_id)
      .eq('artista_id', artista_id);

    if (error) throw error;

    res.status(200).json({ message: 'Has dejado de seguir al artista.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al dejar de seguir artista.' });
  }
};

// NUEVO: Progreso de canciones de un artista considerando similaridad
const getProgresoCancionesArtista = async (req, res) => {
  const { usuario_id, artista_id } = req.query;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: "Faltan parámetros" });

  // 1. Todas las canciones del artista
  const { data: canciones } = await supabase
    .from('cancion_artistas')
    .select('cancion_id, canciones(titulo, duracion_ms)')
    .eq('artista_id', artista_id);

  // 2. Canciones valoradas por el usuario
  const { data: valoradas } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuario_id);

  const valoradasIds = new Set((valoradas || []).map(v => v.cancion));
  const cancionesFull = (canciones || []).map(c => ({
    id_cancion: c.cancion_id,
    titulo: c.canciones?.titulo || "",
    duracion_ms: c.canciones?.duracion_ms || 0
  }));

  // 3. Marca como valorada si es igual o similar a una valorada
  let valoradasOEquivalentes = new Set();
  for (const song of cancionesFull) {
    if (valoradasIds.has(song.id_cancion)) {
      valoradasOEquivalentes.add(song.id_cancion);
      continue;
    }
    // Busca si hay una valorada similar
    for (const vId of valoradasIds) {
      const vSong = cancionesFull.find(s => s.id_cancion === vId);
      if (vSong && esCancionSimilar(song, vSong)) {
        valoradasOEquivalentes.add(song.id_cancion);
        break;
      }
    }
  }

  const total = cancionesFull.length;
  const valoradasCount = valoradasOEquivalentes.size;
  const porcentaje = total ? Math.round((valoradasCount / total) * 100) : 0;

  res.json({
    total,
    valoradas: valoradasCount,
    porcentaje,
    ids_valoradas: Array.from(valoradasOEquivalentes)
  });
};

module.exports = { getCatalogosByUsuario, seguirArtistaCatalogo, getArtistasSeguidos, dejarDeSeguirArtista, getProgresoCancionesArtista };