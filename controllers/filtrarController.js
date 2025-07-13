const supabase = require('../db');

const filtrarEntidades = async (req, res) => {
  const { artista, genero, entidad, anio, orden, termino, pagina = 1 } = req.query;
  const LIMITE_PAGINA = 1000;
  const paginaNum = parseInt(pagina) || 1;
  const desde = (paginaNum - 1) * LIMITE_PAGINA;
  const hasta = desde + LIMITE_PAGINA; // Esto da 1001 resultados

  try {
    let query = supabase.from('vista_orden_intercalada').select('*');

    if (termino) query = query.ilike('nombre', `%${termino}%`);
    if (artista) query = query.eq('artista_id', parseInt(artista));
    if (genero) query = query.ilike('generos', `%${genero}%`);
    if (anio) query = query.eq('anio', parseInt(anio));
    if (entidad) query = query.eq('tipo', entidad);

    // Ordenar según el parámetro recibido
    if (orden === 'popularidad') {
      query = query.order('popularidad', { ascending: false });
    } else if (orden === 'valoracion') {
      query = query.order('valoracion_promedio', { ascending: false });
    } else {
      query = query.order('rn', { ascending: true }).order('entidad_orden', { ascending: true });
    }

    // Agrega paginación
    query = query.range(desde, hasta);

    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al filtrar entidades:', error);
    res.status(500).json({ error: error.message });
  }
};

const contarEntidades = async (req, res) => {
  const { artista, genero, entidad, anio, orden, termino } = req.query;
  try {
    let query = supabase.from('vista_orden_intercalada').select('*', { count: 'exact', head: true });
    if (termino) query = query.ilike('nombre', `%${termino}%`);
    if (artista) query = query.eq('artista_id', parseInt(artista));
    if (genero) query = query.ilike('generos', `%${genero}%`);
    if (anio) query = query.eq('anio', parseInt(anio));
    if (entidad) query = query.eq('tipo', entidad);
    const { count, error } = await query;
    if (error) throw error;
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const contarArtistas = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('artistas')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const contarAlbumes = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('albumes')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const contarCanciones = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('canciones')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const contarVideos = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('artistas')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { filtrarEntidades, contarEntidades, contarArtistas, contarAlbumes, contarCanciones, contarVideos };