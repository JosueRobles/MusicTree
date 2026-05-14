const supabase = require('../db');

// Álbum -> Canciones con promedio y conteo de valoraciones
const obtenerCancionesDeAlbum = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener las canciones del álbum
    const { data: canciones, error: cancionesError } = await supabase
      .from('canciones')
      .select('*')
      .eq('album', id)
      .order('orden', { ascending: true });

    if (cancionesError) throw cancionesError;

    const cancionesConValoraciones = [];

    // 2. Para cada canción, obtener promedio y conteo de valoraciones
    for (const cancion of canciones) {
      const { data: valoraciones, error: valoracionesError } = await supabase
        .from('valoraciones_canciones')
        .select('calificacion')
        .eq('cancion', cancion.id_cancion);

      if (valoracionesError) {
        console.error("Error ...", err.body?.error?.message || err.message || JSON.stringify(err));
        continue;
      }

      const valoracionesCount = valoraciones.length;
      const promedioValoracion =
        valoracionesCount > 0
          ? (valoraciones.reduce((sum, v) => sum + parseFloat(v.calificacion), 0) / valoracionesCount).toFixed(1)
          : null;

      cancionesConValoraciones.push({
        ...cancion,
        valoraciones_count: valoracionesCount,
        promedio_valoracion: promedioValoracion,
      });
    }

    res.status(200).json({ canciones: cancionesConValoraciones });
  } catch (error) {
    console.error("❌ Error al obtener canciones del álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Canción -> Álbum
const obtenerAlbumDeCancion = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: cancion, error: cancionError } = await supabase
      .from('canciones')
      .select('album')
      .eq('id_cancion', id)
      .single();

    if (cancionError || !cancion) {
      console.error("Error al obtener canción:", cancionError);
      return res.status(404).json({ error: "Canción no encontrada" });
    }

    const { data: album, error: albumError } = await supabase
      .from('albumes')
      .select('id_album, titulo, anio, foto_album')
      .eq('id_album', cancion.album)
      .single();

    if (albumError || !album) {
      console.error("Error al obtener álbum:", albumError);
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    res.status(200).json({ album });
  } catch (error) {
    console.error("❌ Error al obtener álbum de la canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerCancionesDeAlbum, obtenerAlbumDeCancion };