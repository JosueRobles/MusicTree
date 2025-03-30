const supabase = require('../db');

const obtenerCancionesDeAlbum = async (req, res) => {
  const { id } = req.params; // ID del álbum

  try {
    const { data, error } = await supabase
      .from('canciones')
      .select('*')
      .eq('album', id);

    if (error) throw error;

    res.status(200).json({ songs: data });
  } catch (error) {
    console.error("❌ Error al obtener canciones del álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerCancionesDeAlbum };