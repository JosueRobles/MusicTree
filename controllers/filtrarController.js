const supabase = require('../db');

const filtrarEntidades = async (req, res) => {
  const { artista, genero, entidad, anio, orden, termino, usuario } = req.query;

  try {
    let query;

    // Construir la consulta inicial basada en la entidad
    if (entidad === 'artist') {
      query = supabase.from('artistas').select('*');
    } else if (entidad === 'album') {
      query = supabase.from('albumes').select('*');
    } else if (entidad === 'song') {
      query = supabase.from('canciones').select('*');
    } else if (entidad === 'video') {
      query = supabase.from('videos_musicales').select('*');
    } else {
      query = supabase.from('vista_orden_predeterminado').select('*');
    }

    // Aplicar filtros dinámicamente
    if (termino) {
      query = query.ilike('nombre', `%${termino}%`);
    }
    if (artista) {
      query = query.eq('artista_id', parseInt(artista));
    }
    if (genero) {
      query = query.ilike('generos', `%${genero}%`);
    }
    if (anio) {
      query = query.eq('anio', parseInt(anio));
    }

    // Ordenar por la opción seleccionada
    if (orden === 'popularidad') {
      query = query.order('popularidad', { ascending: false });
    } else if (orden === 'valoracion') {
      query = query.order('valoracion_promedio', { ascending: false });
    } else if (orden === 'ranking_personal' && usuario) {
      query = supabase
        .from('ranking_elementos')
        .select('entidad_id, nombre, valoracion, posicion')
        .eq('ranking_id', usuario)
        .eq('tipo_entidad', entidad)
        .order('posicion', { ascending: true });
    } else if (orden === 'ranking_comunitario') {
      query = supabase
        .from('ranking_elementos')
        .select('entidad_id, AVG(posicion) AS posicion_promedio')
        .eq('tipo_entidad', entidad)
        .order('posicion_promedio', { ascending: true });
    }

    // Ejecutar la consulta
    const { data, error } = await query;

    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al filtrar entidades:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { filtrarEntidades };