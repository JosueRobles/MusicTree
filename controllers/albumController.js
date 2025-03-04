const supabase = require("../db");

const crearAlbum = async (req, res) => {
  const { titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album } = req.body;

  try {
    const { data, error } = await supabase
      .from('albumes')
      .insert([{ titulo, anio, foto_album, artista_id, numero_canciones, tipo_album, popularidad_album }])
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Error al crear álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerAlbumes = async (req, res) => {
  try {
    const { data, error } = await supabase.from('albumes').select('*');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener álbumes:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerAlbumPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: album, error: albumError } = await supabase
      .from('albumes')
      .select('*')
      .eq('id_album', id)
      .single();

    if (albumError) {
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    const { data: canciones, error: cancionesError } = await supabase
      .from('canciones')
      .select('*')
      .eq('album', id);

    if (cancionesError) {
      return res.status(500).json({ error: "Error al obtener canciones" });
    }

    res.json({ album, canciones });
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

module.exports = { crearAlbum, obtenerAlbumes, obtenerAlbumPorId, actualizarAlbum, eliminarAlbum };