const supabase = require("../db");

const crearArtista = async (req, res) => {
  const { nombre_artista, biografia, foto_artista } = req.body;

  try {
    const { data, error } = await supabase
      .from('artistas')
      .insert([{ nombre_artista, biografia, foto_artista }])
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear artista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerArtistas = async (req, res) => {
  try {
    const { data, error } = await supabase.from('artistas').select('*');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener artistas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerArtistaPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: artista, error: artistaError } = await supabase
      .from('artistas')
      .select('*')
      .eq('id_artista', id)
      .single();

    if (artistaError) {
      return res.status(404).json({ error: "Artista no encontrado" });
    }

    const { data: albumes, error: albumesError } = await supabase
  .from('albumes')
  .select('*')
  .eq('artista_id', id);

// Verifica si albumes es nulo o vacío antes de intentar map()
if (!albumes || albumes.length === 0) {
  return res.json({ artista, albumes: [], canciones: [] });
}

const { data: canciones, error: cancionesError } = await supabase
  .from('canciones')
  .select('*')
  .in('album', albumes.map(album => album.ID_album));

if (cancionesError) {
  return res.status(500).json({ error: "Error al obtener canciones" });
}
    res.json({ artista, albumes, canciones });
  } catch (error) {
    console.error("❌ Error al obtener artista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarArtista = async (req, res) => {
  const { id } = req.params;
  const { nombre_artista, biografia, foto_artista } = req.body;

  try {
    const { data, error } = await supabase
      .from('artistas')
      .update({ nombre_artista, biografia, foto_artista })
      .eq('id_artista', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Artista no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Error al actualizar artista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarArtista = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('artistas')
      .delete()
      .eq('id_artista', id)
      .single();

    if (error) {
      return res.status(404).json({ error: "Artista no encontrado" });
    }

    res.json({ message: "Artista eliminado con éxito" });
  } catch (error) {
    console.error("❌ Error al eliminar artista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { crearArtista, obtenerArtistas, obtenerArtistaPorId, actualizarArtista, eliminarArtista };