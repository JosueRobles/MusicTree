const express = require('express');
const router = express.Router();
const { getCatalogosByUsuario, seguirArtistaCatalogo, getArtistasSeguidos, dejarDeSeguirArtista, getProgresoCancionesArtista, searchSpotifyArtists, createArtistFromSpotify, getPedidosUsuario } = require('../controllers/catalogosController');
const { registrarActividad } = require('../controllers/utils/actividadUtils');
const supabase = require('../supabaseClient'); // o '../db' según tu estructura

router.get('/usuario/:usuarioId', getCatalogosByUsuario);
router.post('/search-spotify', searchSpotifyArtists);
router.post('/create-artist', createArtistFromSpotify);
router.post('/seguir', seguirArtistaCatalogo);
router.post('/unfollow', dejarDeSeguirArtista); // <-- agrega esto
router.get('/artistas-seguidos/:usuarioId', getArtistasSeguidos);
router.get('/pedidos-usuario/:usuario_id', getPedidosUsuario);
router.get('/pendientes-valoracion/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const { tipo, offset = 0, limit = 10 } = req.query;

  // 1. Artistas seguidos
  const { data: artistas } = await supabase
    .from('seguimiento_artistas')
    .select('artista_id')
    .eq('usuario_id', usuarioId);

  if (!artistas || artistas.length === 0) return res.json([]);

  const artistaIds = artistas.map(a => a.artista_id);
  let pendientes = [];

  // ========================
  // Álbumes pendientes
  // ========================
  const { data: albumes } = await supabase
    .from('album_artistas')
    .select('album_id, artista_id, albumes(titulo, foto_album, popularidad_album)')
    .in('artista_id', artistaIds);

  const { data: albumesValorados } = await supabase
    .from('valoraciones_albumes')
    .select('album')
    .eq('usuario', usuarioId);

  const albumesValoradosSet = new Set(albumesValorados.map(a => a.album));

  for (const album of albumes || []) {
    if (!albumesValoradosSet.has(album.album_id)) {
      pendientes.push({
        tipo_entidad: 'album',
        referencia_id: album.album_id,
        referencia_info: {
          titulo: album.albumes.titulo,
          foto_album: album.albumes.foto_album,
          popularidad: album.albumes.popularidad_album || 0
        },
        artista_id: album.artista_id
      });
    }
  }

  // ========================
  // Canciones pendientes
  // ========================
  const { data: canciones } = await supabase
    .from('cancion_artistas')
    .select('cancion_id, artista_id, canciones(titulo, popularidad, album)')
    .in('artista_id', artistaIds);

  const { data: cancionesValoradas } = await supabase
    .from('valoraciones_canciones')
    .select('cancion')
    .eq('usuario', usuarioId);

  const cancionesValoradasSet = new Set(cancionesValoradas.map(c => c.cancion));

  // Traemos todas las fotos de álbumes en bloque
  const albumIds = [...new Set(canciones.map(c => c.canciones.album).filter(Boolean))];
  const { data: albumesInfo } = await supabase
    .from('albumes')
    .select('id_album, foto_album')
    .in('id_album', albumIds);

  const albumFotoMap = Object.fromEntries(albumesInfo.map(a => [a.id_album, a.foto_album]));

  for (const cancion of canciones || []) {
    if (!cancionesValoradasSet.has(cancion.cancion_id)) {
      pendientes.push({
        tipo_entidad: 'cancion',
        referencia_id: cancion.cancion_id,
        referencia_info: {
          titulo: cancion.canciones.titulo,
          foto: albumFotoMap[cancion.canciones.album] || null,
          popularidad: cancion.canciones.popularidad || 0,
        },
        artista_id: cancion.artista_id
      });
    }
  }

  // ========================
  // Videos pendientes
  // ========================
  const { data: videos } = await supabase
    .from('video_artistas')
    .select('video_id, artista_id, videos_musicales(titulo, miniatura, popularidad)')
    .in('artista_id', artistaIds);

  const { data: videosValorados } = await supabase
    .from('valoraciones_videos_musicales')
    .select('video')
    .eq('usuario', usuarioId);

  const videosValoradosSet = new Set(videosValorados.map(v => v.video));

  for (const video of videos || []) {
    if (!videosValoradosSet.has(video.video_id)) {
      pendientes.push({
        tipo_entidad: 'video',
        referencia_id: video.video_id,
        referencia_info: {
          titulo: video.videos_musicales.titulo,
          miniatura: video.videos_musicales.miniatura,
          popularidad: video.videos_musicales.popularidad || 0,
        },
        artista_id: video.artista_id
      });
    }
  }

  // ========================
  // Clustering (agrupación)
  // ========================
  if (tipo === "album") {
    const { data: clusters } = await supabase.from('album_clusters').select('id_album, grupo');
    const clusterMap = Object.fromEntries(clusters.map(a => [a.id_album, a.grupo]));
    const porGrupo = {};
    pendientes.filter(p => p.tipo_entidad === "album").forEach(item => {
      const grupo = clusterMap[item.referencia_id] || item.referencia_id;
      if (!porGrupo[grupo] || (item.referencia_info.popularidad > porGrupo[grupo].referencia_info.popularidad)) {
        porGrupo[grupo] = item;
      }
    });
    pendientes = Object.values(porGrupo);
  }

  // ========================
  // Filtrar por tipo y paginar
  // ========================
  if (tipo) {
    pendientes = pendientes.filter(p => p.tipo_entidad === tipo);
  }

  pendientes = pendientes
    .sort((a, b) => (b.referencia_info.popularidad || 0) - (a.referencia_info.popularidad || 0))
    .slice(Number(offset), Number(offset) + Number(limit));

  res.json(pendientes);
});

router.post('/votar-pedido', async (req, res) => {
  const { usuario_id, artista_id } = req.body;
  if (!usuario_id || !artista_id) return res.status(400).json({ error: 'Faltan datos.' });

  // Evita votos duplicados
  const { data: existente } = await supabase
    .from('pedidos_catalogo')
    .select('id')
    .eq('usuario_id', usuario_id)
    .eq('artista_id', artista_id)
    .single();

  if (existente) return res.status(200).json({ message: 'Ya votaste por este artista.' });

  const { error } = await supabase
    .from('pedidos_catalogo')
    .insert([{ usuario_id, artista_id }]);

  if (error) return res.status(500).json({ error: 'Error al registrar el voto.' });

  // REGISTRA ACTIVIDAD PARA EL FEED
  try {
    await registrarActividad(usuario_id, 'pedido_catalogo', 'artista', artista_id);
  } catch (e) {
    console.error('Error al registrar actividad de pedido_catalogo:', e);
  }

  res.status(201).json({ message: 'Voto registrado.' });
});

router.get('/mas-pedidos', async (req, res) => {
  // Trae todos los votos
  const { data, error } = await supabase
    .from('pedidos_catalogo')
    .select('artista_id');

  if (error) return res.status(500).json({ error: 'Error al obtener artistas más pedidos.' });

  // Cuenta votos por artista_id
  const conteo = {};
  for (const row of data) {
    conteo[row.artista_id] = (conteo[row.artista_id] || 0) + 1;
  }
  // Ordena por votos descendente
  const ordenados = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .map(([artista_id, votos]) => ({ artista_id: parseInt(artista_id), votos }));

  // Trae info de los artistas
  const ids = ordenados.map(d => d.artista_id);
  let artistasInfo = [];
  if (ids.length > 0) {
    const { data: artistas } = await supabase
      .from('artistas')
      .select('id_artista, nombre_artista, foto_artista')
      .in('id_artista', ids);
    artistasInfo = artistas || [];
  }

  // Une info
  const resultado = ordenados.map(d => ({
    artista_id: d.artista_id,
    votos: d.votos,
    ...artistasInfo.find(a => a.id_artista === d.artista_id)
  }));

  res.json(resultado);
});

router.get('/votos-usuario/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;
  const { data, error } = await supabase
    .from('pedidos_catalogo')
    .select('artista_id')
    .eq('usuario_id', usuario_id);
  if (error) return res.status(500).json({ error: 'Error al obtener votos.' });
  res.json(data);
});

router.get('/progreso-canciones', getProgresoCancionesArtista);

module.exports = router;