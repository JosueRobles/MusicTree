const supabase = require('../supabaseClient');
const { registrarActividad } = require('./utils/actividadUtils');

const getCatalogosByUsuario = async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const { data, error } = await supabase
      .from('vista_progreso_catalogos')
      .select('id_artista, nombre_artista, foto_artista, progreso')
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('Error al obtener progreso de catálogos:', err);
    res.status(500).json({ error: 'Error al obtener progreso de catálogos.' });
  }
};

const seguirArtistaCatalogo = async (req, res) => {
  const { usuario_id, artista_id } = req.body;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: 'Faltan datos.' });

  try {
    // Verifica si ya existe
    const { data: existente } = await supabase
      .from('seguimiento_artistas')
      .select('id')
      .eq('usuario_id', usuario_id)
      .eq('artista_id', artista_id)
      .single();

    if (existente) return res.status(200).json({ message: 'Ya seguía al artista.' });

    // Inserta
    const { error } = await supabase
      .from('seguimiento_artistas')
      .insert([{ usuario_id, artista_id }]);
    if (error) throw error;

    // Registrar actividad
    await registrarActividad(usuario_id, 'seguimiento_artista', 'artista', artista_id);

    res.status(201).json({ message: 'Ahora sigues al artista.' });
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

module.exports = { getCatalogosByUsuario, seguirArtistaCatalogo, getArtistasSeguidos, dejarDeSeguirArtista };