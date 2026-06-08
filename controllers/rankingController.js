const supabase = require('../db');

// Ranking personal con filtros
const obtenerRankingPersonal = async (req, res) => {
  const { usuario, tipo_entidad } = req.query;
  let entidadTable = "";
  let entidadNameCol = "";
  let entidadIdCol = "";
  let entidadFotoCol = "";

  if (tipo_entidad === "artista") {
    entidadTable = "artistas";
    entidadNameCol = "nombre_artista";
    entidadIdCol = "id_artista";
    entidadFotoCol = "foto_artista";
  } else if (tipo_entidad === "album") {
    entidadTable = "albumes";
    entidadNameCol = "titulo";
    entidadIdCol = "id_album";
    entidadFotoCol = "foto_album";
  } else if (tipo_entidad === "cancion") {
    entidadTable = "canciones";
    entidadNameCol = "titulo";
    entidadIdCol = "id_cancion";
    entidadFotoCol = null; // No hay foto en canciones
  } else if (tipo_entidad === "video") {
    entidadTable = "videos_musicales";
    entidadNameCol = "titulo";
    entidadIdCol = "id_video";
    entidadFotoCol = "miniatura";
  }

  const minimal = req.query.minimal === 'true' || req.query.minimal === '1' || req.query.simple === 'true';
  const contextoTipo = req.query.contexto_tipo;
  const contextoId = req.query.contexto_id ? parseInt(req.query.contexto_id) : null;

  try {
    // 1. Trae los elementos del ranking personal
    const rankingQuery = supabase
      .from('ranking_elementos')
      .select(minimal ? 'id, entidad_id, valoracion, posicion' : '*')
      .eq('ranking_id', usuario)
      .eq('tipo_entidad', tipo_entidad)
      .order('posicion', { ascending: true });

    const { data: ranking, error: rankingError } = await rankingQuery;

    if (rankingError) throw rankingError;

    // 2. Trae los nombres de las entidades
    const entidadIds = ranking.map(item => item.entidad_id);
    let entidades = [];
    if (entidadIds.length > 0) {
      if (tipo_entidad === "cancion") {
        // Traer también el álbum, su foto y duración
        const { data: cancionesData, error: cancionesError } = await supabase
          .from("canciones")
          .select("id_cancion, titulo, album, duracion_ms, albumes!fk_album(foto_album)")
          .in("id_cancion", entidadIds);

        if (cancionesError) throw cancionesError;
        entidades = cancionesData.map(c => ({
          id_cancion: c.id_cancion,
          titulo: c.titulo,
          album: c.album,
          duracion_ms: c.duracion_ms,
          foto_album: c.albumes?.foto_album || null,
        }));
      } else {
        const selectCols = [entidadIdCol, entidadNameCol];
        if (entidadFotoCol) selectCols.push(entidadFotoCol);
        if (tipo_entidad === 'album') selectCols.push('anio');
        if (tipo_entidad === 'video') selectCols.push('duracion');
        const { data: entidadesData, error: entidadesError } = await supabase
          .from(entidadTable)
          .select(selectCols.join(", "))
          .in(entidadIdCol, entidadIds);

        if (entidadesError) throw entidadesError;
        entidades = entidadesData;
      }
    }

    // 3. Prepara relaciones para filtros de contexto
    const artistasPorEntidad = {};
    const coleccionesPorEntidad = {};
    const coleccionIds = new Set();

    if (entidadIds.length > 0) {
      if (tipo_entidad === 'cancion') {
        const { data: cancionArtistas, error: artistasError } = await supabase
          .from('cancion_artistas')
          .select('cancion_id, artista_id, artistas(nombre_artista)')
          .in('cancion_id', entidadIds);
        if (artistasError) throw artistasError;

        cancionArtistas.forEach(row => {
          const cancionKey = String(row.cancion_id);
          artistasPorEntidad[cancionKey] = artistasPorEntidad[cancionKey] || [];
          artistasPorEntidad[cancionKey].push({ id: row.artista_id, nombre: row.artistas?.nombre_artista });
        });

        const { data: coleccionElementos, error: coleccionError } = await supabase
          .from('colecciones_elementos')
          .select('entidad_id, coleccion_id')
          .eq('entidad_tipo', 'cancion')
          .in('entidad_id', entidadIds);
        if (coleccionError) throw coleccionError;

        coleccionElementos.forEach(row => {
          const entidadKey = String(row.entidad_id);
          coleccionesPorEntidad[entidadKey] = coleccionesPorEntidad[entidadKey] || [];
          coleccionesPorEntidad[entidadKey].push(row.coleccion_id);
          coleccionIds.add(row.coleccion_id);
        });
      } else if (tipo_entidad === 'album') {
        const { data: albumArtistas, error: artistasError } = await supabase
          .from('album_artistas')
          .select('album_id, artista_id, artistas(nombre_artista)')
          .in('album_id', entidadIds);
        if (artistasError) throw artistasError;

        albumArtistas.forEach(row => {
          const albumKey = String(row.album_id);
          artistasPorEntidad[albumKey] = artistasPorEntidad[albumKey] || [];
          artistasPorEntidad[albumKey].push({ id: row.artista_id, nombre: row.artistas?.nombre_artista });
        });

        const { data: coleccionElementos, error: coleccionError } = await supabase
          .from('colecciones_elementos')
          .select('entidad_id, coleccion_id')
          .eq('entidad_tipo', 'album')
          .in('entidad_id', entidadIds);
        if (coleccionError) throw coleccionError;

        coleccionElementos.forEach(row => {
          const entidadKey = String(row.entidad_id);
          coleccionesPorEntidad[entidadKey] = coleccionesPorEntidad[entidadKey] || [];
          coleccionesPorEntidad[entidadKey].push(row.coleccion_id);
          coleccionIds.add(row.coleccion_id);
        });
      } else if (tipo_entidad === 'video') {
        const { data: videoArtistas, error: artistasError } = await supabase
          .from('video_artistas')
          .select('video_id, artista_id, artistas(nombre_artista)')
          .in('video_id', entidadIds);
        if (artistasError) throw artistasError;

        videoArtistas.forEach(row => {
          const videoKey = String(row.video_id);
          artistasPorEntidad[videoKey] = artistasPorEntidad[videoKey] || [];
          artistasPorEntidad[videoKey].push({ id: row.artista_id, nombre: row.artistas?.nombre_artista });
        });

        const { data: coleccionElementos, error: coleccionError } = await supabase
          .from('colecciones_elementos')
          .select('entidad_id, coleccion_id')
          .eq('entidad_tipo', 'video')
          .in('entidad_id', entidadIds);
        if (coleccionError) throw coleccionError;

        coleccionElementos.forEach(row => {
          const entidadKey = String(row.entidad_id);
          coleccionesPorEntidad[entidadKey] = coleccionesPorEntidad[entidadKey] || [];
          coleccionesPorEntidad[entidadKey].push(row.coleccion_id);
          coleccionIds.add(row.coleccion_id);
        });
      } else if (tipo_entidad === 'artista') {
        const { data: coleccionElementos, error: coleccionError } = await supabase
          .from('colecciones_elementos')
          .select('entidad_id, coleccion_id')
          .eq('entidad_tipo', 'artista')
          .in('entidad_id', entidadIds);
        if (coleccionError) throw coleccionError;

        coleccionElementos.forEach(row => {
          const entidadKey = String(row.entidad_id);
          coleccionesPorEntidad[entidadKey] = coleccionesPorEntidad[entidadKey] || [];
          coleccionesPorEntidad[entidadKey].push(row.coleccion_id);
          coleccionIds.add(row.coleccion_id);
        });
      }
    }

    let coleccionNombresById = {};
    if (coleccionIds.size > 0) {
      const { data: coleccionesData, error: coleccionesError } = await supabase
        .from('colecciones')
        .select('id_coleccion, nombre')
        .in('id_coleccion', Array.from(coleccionIds));
      if (coleccionesError) throw coleccionesError;
      coleccionesNombresById = coleccionesData.reduce((acc, c) => {
        acc[c.id_coleccion] = c.nombre;
        return acc;
      }, {});
    }

    if (minimal) {
      let filteredRanking = ranking;
      if (contextoTipo && contextoId) {
        let idsInContext = null;

        if (contextoTipo === 'coleccion') {
          const { data: coleccionElementos, error: coleccionError } = await supabase
            .from('colecciones_elementos')
            .select('entidad_id')
            .eq('entidad_tipo', tipo_entidad)
            .eq('coleccion_id', contextoId);
          if (coleccionError) throw coleccionError;
          idsInContext = new Set((coleccionElementos || []).map(row => String(row.entidad_id)));
        } else if (contextoTipo === 'artista') {
          if (tipo_entidad === 'cancion') {
            const { data: cancionArtistas, error } = await supabase
              .from('cancion_artistas')
              .select('cancion_id')
              .eq('artista_id', contextoId);
            if (error) throw error;
            idsInContext = new Set((cancionArtistas || []).map(row => String(row.cancion_id)));
          } else if (tipo_entidad === 'album') {
            const { data: albumArtistas, error } = await supabase
              .from('album_artistas')
              .select('album_id')
              .eq('artista_id', contextoId);
            if (error) throw error;
            idsInContext = new Set((albumArtistas || []).map(row => String(row.album_id)));
          } else if (tipo_entidad === 'video') {
            const { data: videoArtistas, error } = await supabase
              .from('video_artistas')
              .select('video_id')
              .eq('artista_id', contextoId);
            if (error) throw error;
            idsInContext = new Set((videoArtistas || []).map(row => String(row.video_id)));
          } else if (tipo_entidad === 'artista') {
            idsInContext = new Set([String(contextoId)]);
          }
        }

        if (idsInContext) {
          filteredRanking = ranking.filter(item => idsInContext.has(String(item.entidad_id)));
        } else {
          filteredRanking = [];
        }
      }

      const enrichedMinimal = filteredRanking.map(item => {
        const entidad = tipo_entidad === 'cancion'
          ? entidades.find(e => String(e.id_cancion) === String(item.entidad_id))
          : entidades.find(e => String(e[entidadIdCol]) === String(item.entidad_id));

        const foto = entidad ? (tipo_entidad === 'cancion' ? entidad.foto_album : entidadFotoCol ? entidad[entidadFotoCol] : undefined) : undefined;
        const nombre = entidad ? (tipo_entidad === 'cancion' ? entidad.titulo : entidad[entidadNameCol]) : `ID ${item.entidad_id}`;
        const entidadKey = String(item.entidad_id);
        const artistaInfo = artistasPorEntidad[entidadKey] || [];
        const coleccionInfo = (coleccionesPorEntidad[entidadKey] || []).map(id => ({ id, nombre: coleccionNombresById[id] || `Colección ${id}` }));

        return {
          ...item,
          nombre,
          foto,
          artistas: (tipo_entidad === 'artista' ? undefined : artistaInfo.map(a => a.nombre).filter(Boolean)),
          artista_ids: (tipo_entidad === 'artista' ? [item.entidad_id] : artistaInfo.map(a => a.id)),
          colecciones: coleccionInfo,
          coleccion_ids: coleccionInfo.map(c => c.id),
        };
      });

      return res.status(200).json(enrichedMinimal);
    }

    // 4. Une los resultados y agrega detalles enriquecidos
    const result = await Promise.all(ranking.map(async item => {
      let foto, nombre, detalles = {};
      const entidadKey = String(item.entidad_id);
      let artistaInfo = artistasPorEntidad[entidadKey] || [];
      let coleccionInfo = (coleccionesPorEntidad[entidadKey] || []).map(id => ({ id, nombre: coleccionNombresById[id] || `Colección ${id}` }));

      if (tipo_entidad === "artista") {
        const entidad = entidades.find(e => String(e[entidadIdCol]) === String(item.entidad_id));
        foto = entidad ? entidad[entidadFotoCol] : undefined;
        nombre = entidad ? entidad[entidadNameCol] : `ID ${item.entidad_id}`;
        // ¿Tiene catálogo?
        const es_principal = entidad?.es_principal ?? false;
        let porcentaje = null;
        if (es_principal) {
          // % completado de catálogo
          const { data: prog } = await supabase
            .from('vista_progreso_catalogos')
            .select('progreso')
            .eq('usuario_id', usuario)
            .eq('id_artista', item.entidad_id)
            .maybeSingle();
          porcentaje = prog?.progreso ?? null;
        }
        // Álbumes
        const { data: albumes } = await supabase
          .from('album_artistas')
          .select('albumes(id_album, titulo, foto_album)')
          .eq('artista_id', item.entidad_id);
        // Canciones
        const { data: canciones } = await supabase
          .from('cancion_artistas')
          .select('canciones(id_cancion, titulo)')
          .eq('artista_id', item.entidad_id);
        // Videos
        const { data: videos } = await supabase
          .from('video_artistas')
          .select('videos_musicales(id_video, titulo, miniatura)')
          .eq('artista_id', item.entidad_id);
        // Valoración promedio
        const { data: val } = await supabase
          .from('valoraciones_artistas')
          .select('promedio')
          .eq('artista', item.entidad_id)
          .maybeSingle();
        detalles = {
          albumes: (albumes || []).map(a => a.albumes),
          canciones: (canciones || []).map(c => c.canciones),
          videos: (videos || []).map(v => v.videos_musicales),
          porcentaje,
          es_principal,
          valoracion: item.valoracion
        };
      } else if (tipo_entidad === "album") {
        const entidad = entidades.find(e => String(e[entidadIdCol]) === String(item.entidad_id));
        foto = entidad ? entidad[entidadFotoCol] : undefined;
        nombre = entidad ? entidad[entidadNameCol] : `ID ${item.entidad_id}`;
        // Artistas
        const artistas = artistaInfo;
        // Canciones
        const { data: canciones } = await supabase
          .from('canciones')
          .select('id_cancion')
          .eq('album', item.entidad_id);
        // Valoración promedio y % 5 estrellas
        const { data: val } = await supabase
          .from('valoraciones_albumes')
          .select('promedio, album, calificacion')
          .eq('album', item.entidad_id);
        const valoraciones = val || [];
        const promedio = valoraciones.length > 0
          ? (valoraciones[0].promedio ?? valoraciones[0].calificacion ?? item.valoracion)
          : item.valoracion;
        const cincoEstrellas = valoraciones.filter(v => v.calificacion === 5).length;
        const porcentaje_5_estrellas = valoraciones.length > 0 ? (cincoEstrellas / valoraciones.length) * 100 : null;
        detalles = {
          artistas: artistas.map(a => a.nombre).filter(Boolean),
          numero_canciones: canciones.length,
          anio: entidad?.anio,
          valoracion: promedio,
          porcentaje_5_estrellas: porcentaje_5_estrellas ? porcentaje_5_estrellas.toFixed(1) : null
        };
      } else if (tipo_entidad === "cancion") {
        const entidad = entidades.find(e => String(e.id_cancion) === String(item.entidad_id));
        foto = entidad ? entidad.foto_album : undefined;
        nombre = entidad ? entidad.titulo : `ID ${item.entidad_id}`;
        // Artistas
        const artistas = artistaInfo;
        // Valoración promedio
        const { data: val } = await supabase
          .from('valoraciones_canciones')
          .select('promedio')
          .eq('cancion', item.entidad_id)
          .maybeSingle();
        detalles = {
          artistas: artistas.map(a => a.nombre).filter(Boolean),
          artista_ids: artistas.map(a => a.id),
          album: entidad?.album,
          valoracion: item.valoracion,
          duracion: entidad?.duracion_ms ? `${Math.floor(entidad.duracion_ms / 60000)}:${String(Math.floor((entidad.duracion_ms % 60000) / 1000)).padStart(2, '0')}` : null
        };
      } else if (tipo_entidad === "video") {
        const entidad = entidades.find(e => String(e[entidadIdCol]) === String(item.entidad_id));
        foto = entidad ? entidad[entidadFotoCol] : undefined;
        nombre = entidad ? entidad[entidadNameCol] : `ID ${item.entidad_id}`;
        // Artistas
        const artistas = artistaInfo;
        // Duración
        let duracionSeg = entidad?.duracion || null;
        if (duracionSeg === null) {
          const { data: video, error: videoErr } = await supabase
            .from("videos_musicales")
            .select("duracion")
            .eq("id_video", item.entidad_id)
            .single();
          if (!videoErr && video) {
            duracionSeg = video.duracion;
          }
        }
        detalles = {
          artistas: artistas.map(a => a.nombre).filter(Boolean),
          artista_ids: artistas.map(a => a.id),
          valoracion: item.valoracion,
          duracion: duracionSeg
        };
      }

      return {
        ...item,
        nombre,
        foto,
        artistas: (tipo_entidad === 'artista' ? undefined : (artistaInfo || []).map(a => a.nombre).filter(Boolean)),
        artista_ids: (tipo_entidad === 'artista' ? [item.entidad_id] : (artistaInfo || []).map(a => a.id)),
        colecciones: coleccionInfo,
        coleccion_ids: coleccionInfo.map(c => c.id),
        ...detalles
      };
    }));

    const filteredResult = result.filter(item => {
      if (!contextoTipo || !contextoId) return true;
      if (contextoTipo === 'artista') {
        return item.artista_ids?.some(id => String(id) === String(contextoId));
      }
      if (contextoTipo === 'coleccion') {
        return item.coleccion_ids?.some(id => String(id) === String(contextoId));
      }
      return true;
    });

    res.status(200).json(filteredResult);
  } catch (error) {
    console.error("❌ Error al obtener el ranking personal:", error);
    res.status(500).json({ error: "Error al obtener el ranking personal" });
  }
};

// Recalcular el ranking personal de un usuario
const recalcularRankingPersonal = async (req, res) => {
  const { usuario, tipo_entidad } = req.body;

  try {
    // Consulta preferencias del usuario
    const { data: userData } = await supabase
      .from("usuarios")
      .select("metodologia_valoracion")
      .eq("id_usuario", usuario)
      .single();
    const prefs = userData?.metodologia_valoracion || {};

    // Obtener los elementos del ranking personal
    let { data: elementos, error } = await supabase
      .from('ranking_elementos')
      .select('*')
      .eq('ranking_id', usuario)
      .eq('tipo_entidad', tipo_entidad);

    if (error) throw error;

    // Si modo_ranking=semiautomatico, ordena por valoracion y desempata por % de 5*, 4.5*, etc.
    if (prefs.modo_ranking === "semiautomatico") {
      // Trae valoraciones internas para desempate
      for (const el of elementos) {
        if (tipo_entidad === "album") {
          // Canciones del álbum
          const { data: canciones } = await supabase
            .from("canciones")
            .select("id_cancion")
            .eq("album", el.entidad_id);
          const cancionIds = canciones.map(c => c.id_cancion);
          const { data: vals } = await supabase
            .from("valoraciones_canciones")
            .select("calificacion")
            .eq("usuario", usuario)
            .in("cancion", cancionIds);
          // Calcula % de 5*, 4.5*, 4*, 3.5*, 3*, etc.
          el.porcentajes = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map(star => {
            const count = vals.filter(v => v.calificacion === star).length;
            return vals.length ? count / vals.length : 0;
          });
        } else if (tipo_entidad === "artista") {
          // Albumes, canciones y videos del artista
          const { data: albumes } = await supabase
            .from("album_artistas")
            .select("album_id")
            .eq("artista_id", el.entidad_id);
          const albumIds = albumes.map(a => a.album_id);
          const { data: valsAlbum } = await supabase
            .from("valoraciones_albumes")
            .select("calificacion")
            .eq("usuario", usuario)
            .in("album", albumIds);

          const { data: canciones } = await supabase
            .from("cancion_artistas")
            .select("cancion_id")
            .eq("artista_id", el.entidad_id);
          const cancionIds = canciones.map(c => c.cancion_id);
          const { data: valsCancion } = await supabase
            .from("valoraciones_canciones")
            .select("calificacion")
            .eq("usuario", usuario)
            .in("cancion", cancionIds);

          const { data: videos } = await supabase
            .from("video_artistas")
            .select("video_id")
            .eq("artista_id", el.entidad_id);
          const videoIds = videos.map(v => v.video_id);
          const { data: valsVideo } = await supabase
            .from("valoraciones_videos_musicales")
            .select("calificacion")
            .eq("usuario", usuario)
            .in("video", videoIds);

          // Junta todas las valoraciones
          const allVals = [
            ...valsAlbum.map(v => v.calificacion),
            ...valsCancion.map(v => v.calificacion),
            ...valsVideo.map(v => v.calificacion),
          ];
          el.porcentajes = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map(star => {
            const count = allVals.filter(v => v === star).length;
            return allVals.length ? count / allVals.length : 0;
          });
        } else {
          el.porcentajes = [];
        }
      }
      // Ordena por valoracion y luego por % de 5*, 4.5*, etc.
      elementos.sort((a, b) => {
        if (b.valoracion !== a.valoracion) return b.valoracion - a.valoracion;
        for (let i = 0; i < a.porcentajes.length; i++) {
          if (b.porcentajes[i] !== a.porcentajes[i]) return b.porcentajes[i] - a.porcentajes[i];
        }
        return 0;
      });
    } else {
      // Orden manual: por posicion
      elementos.sort((a, b) => a.posicion - b.posicion);
    }

    // Recalcular las posiciones
    for (let i = 0; i < elementos.length; i++) {
      const { id } = elementos[i];
      const { error: updateError } = await supabase
        .from('ranking_elementos')
        .update({ posicion: i + 1 })
        .eq('id', id);

      if (updateError) throw updateError;
    }

    res.status(200).json({ mensaje: "Ranking personal recalculado correctamente" });
  } catch (error) {
    console.error("❌ Error al recalcular el ranking personal:", error);
    res.status(500).json({ error: "Error al recalcular el ranking personal" });
  }
};

// Ranking global con filtros
const obtenerRankingGlobal = async (req, res) => {
  const { tipo_entidad, anio, artista, genero } = req.query;

  try {
    let vista = '';
    if (tipo_entidad === 'album') vista = 'ranking_global_album_con_peso';
    else if (tipo_entidad === 'cancion') vista = 'ranking_global_cancion_con_peso';
    else if (tipo_entidad === 'artista') vista = 'ranking_global_artista_con_peso';
    else if (tipo_entidad === 'video') vista = 'ranking_global_video_con_peso';
    else return res.status(400).json({ error: "Tipo de entidad no válido" });

    const LIMITE_PAGINA = 1000;
    const paginaNum = parseInt(req.query.pagina) || 1;
    const desde = (paginaNum - 1) * LIMITE_PAGINA;
    const hasta = desde + LIMITE_PAGINA; // Esto da 1001 resultados

    let query = supabase.from(vista).select('*');
    query = query.range(desde, hasta);
    if (anio) query = query.eq('anio', parseInt(anio));
    if (artista) query = query.eq('artista_id', parseInt(artista));
    if (genero) query = query.ilike('generos', `%${genero}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error al obtener el ranking global:", error);
    res.status(500).json({ error: "Error al obtener el ranking global" });
  }
};

// Obtener elementos ordenados por ranking personal
const obtenerPorRankingPersonal = async (req, res) => {
  const { usuario, tipo_entidad } = req.query;

  try {
    const { data, error } = await supabase
      .from('ranking_elementos')
      .select('entidad_id, nombre, valoracion, posicion')
      .eq('ranking_id', usuario)
      .eq('tipo_entidad', tipo_entidad)
      .order('posicion', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error al obtener elementos por ranking personal:", error);
    res.status(500).json({ error: "Error al obtener elementos por ranking personal" });
  }
};

// Nuevo endpoint para actualizar el orden del ranking personal
const actualizarOrdenRankingPersonal = async (req, res) => {
  const { usuario, tipo_entidad, nuevoOrden } = req.body;
  // nuevoOrden: [{ id, posicion }, ...]
  try {
    const newItems = [];
    const existingItems = [];
    const newEntityIds = [];

    for (const { id, posicion } of nuevoOrden) {
      if (id.toString().startsWith('new-')) {
        const entidad_id = parseInt(id.toString().replace('new-', ''), 10);
        newItems.push({ entidad_id, posicion });
        newEntityIds.push(entidad_id);
      } else {
        existingItems.push({ id, posicion });
      }
    }

    // Comprobar si alguno de los nuevos elementos ya existe en el ranking
    const existingByEntity = {};
    if (newEntityIds.length > 0) {
      const { data: existingEntities, error: existingEntitiesError } = await supabase
        .from('ranking_elementos')
        .select('id, entidad_id')
        .eq('ranking_id', usuario)
        .eq('tipo_entidad', tipo_entidad)
        .in('entidad_id', newEntityIds);

      if (existingEntitiesError) {
        throw existingEntitiesError;
      }

      (existingEntities || []).forEach(row => {
        existingByEntity[row.entidad_id] = row.id;
      });
    }

    const inserts = [];
    const updates = [...existingItems];

    for (const item of newItems) {
      if (existingByEntity[item.entidad_id]) {
        updates.push({ id: existingByEntity[item.entidad_id], posicion: item.posicion });
      } else {
        inserts.push({
          ranking_id: usuario,
          tipo_entidad,
          entidad_id: item.entidad_id,
          posicion: item.posicion,
        });
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('ranking_elementos')
        .insert(inserts);
      if (insertError) throw insertError;
    }

    if (updates.length > 0) {
      const { error: upsertError } = await supabase
        .from('ranking_elementos')
        .upsert(updates, { onConflict: 'id' });
      if (upsertError) throw upsertError;
    }

    res.status(200).json({ mensaje: "Orden actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar el orden del ranking personal:", error);
    res.status(500).json({ error: "Error al actualizar el orden" });
  }
};

// Obtener posición global de una entidad
const obtenerPosicionGlobal = async (req, res) => {
  const { tipo_entidad, entidad_id } = req.query;

  let vista = '';
  let idCol = '';
  let promedioCol = '';

  if (tipo_entidad === 'album') {
    vista = 'ranking_global_album_con_peso';
    idCol = 'album_id';
    promedioCol = 'promedio_album';
  } else if (tipo_entidad === 'cancion') {
    vista = 'ranking_global_cancion_con_peso';
    idCol = 'cancion_id';
    promedioCol = 'promedio_cancion';
  } else if (tipo_entidad === 'artista') {
    vista = 'ranking_global_artista_con_peso';
    idCol = 'artista_id';
    promedioCol = 'promedio_artista';
  } else if (tipo_entidad === 'video') {
    vista = 'ranking_global_video_con_peso';
    idCol = 'video_id';
    promedioCol = 'promedio_video';
  } else {
    return res.status(400).json({ error: "Tipo de entidad no válido" });
  }

  try {
    const { data, error } = await supabase
      .from(vista)
      .select(`${idCol}`)
      .order(promedioCol, { ascending: false });

    if (error) throw error;

    const posicion = data.findIndex(e => String(e[idCol]) === String(entidad_id)) + 1;

    res.json({ posicion: posicion > 0 ? posicion : null });
  } catch (err) {
    console.error("❌ Error al obtener la posición global:", err);
    res.status(500).json({ error: err.message });
  }
};

// Exporta la función
module.exports = {
  obtenerRankingPersonal,
  recalcularRankingPersonal,
  obtenerRankingGlobal,
  obtenerPorRankingPersonal,
  actualizarOrdenRankingPersonal,
  obtenerPosicionGlobal,
};