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
    // Obtener información del artista
    const { data: artista, error: artistaError } = await supabase
      .from('artistas')
      .select('*')
      .eq('id_artista', id)
      .single();
    
    if (artistaError) {
      return res.status(404).json({ error: "Artista no encontrado" });
    }
    
    // Obtener álbumes relacionados con el artista
    const { data: albumesIDs, error: albumesIDsError } = await supabase
      .from('album_artistas')
      .select('album_id')
      .eq('artista_id', id);
    
    if (albumesIDsError) {
      return res.status(500).json({ error: "Error al obtener álbumes" });
    }
    
    let albumes = [];
    if (albumesIDs && albumesIDs.length > 0) {
      const albumIds = albumesIDs.map(item => item.album_id);
      const { data: albumesData, error: albumesError } = await supabase
        .from('albumes')
        .select('id_album, titulo, anio, foto_album')
        .in('id_album', albumIds);
      
      if (!albumesError && albumesData) {
        albumes = albumesData;
      }
    }
    
    // Obtener canciones del artista
    const { data: cancionesIDs, error: cancionesIDsError } = await supabase
      .from('cancion_artistas')
      .select('cancion_id')
      .eq('artista_id', id);
    
    if (cancionesIDsError) {
      return res.status(500).json({ error: "Error al obtener canciones" });
    }
    
    let canciones = [];
    if (cancionesIDs && cancionesIDs.length > 0) {
      const cancionIds = cancionesIDs.map(item => item.cancion_id);
      const { data: cancionesData, error: cancionesError } = await supabase
        .from('canciones')
        .select('id_cancion, titulo')
        .in('id_cancion', cancionIds);
      
      if (!cancionesError && cancionesData) {
        canciones = cancionesData;
      }
    }
    
    // Enviar respuesta con el formato esperado por el frontend
    res.json({ 
      artista, 
      albumes, 
      canciones 
    });
    
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