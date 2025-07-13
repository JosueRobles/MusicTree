const express = require('express');
const router = express.Router();
const { getCatalogosByUsuario, seguirArtistaCatalogo, getArtistasSeguidos, dejarDeSeguirArtista } = require('../controllers/catalogosController');
const supabase = require('../supabaseClient'); // o '../db' según tu estructura

router.get('/usuario/:usuarioId', getCatalogosByUsuario);
router.post('/seguir', seguirArtistaCatalogo);
router.post('/unfollow', dejarDeSeguirArtista); // <-- agrega esto
router.get('/artistas-seguidos/:usuarioId', getArtistasSeguidos);
router.get('/pendientes-valoracion/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  // 1. Artistas seguidos
  const { data: artistas } = await supabase
    .from('seguimiento_artistas')
    .select('artista_id')
    .eq('usuario_id', usuarioId);

  if (!artistas || artistas.length === 0) return res.json([]);

  const pendientes = [];

  for (const { artista_id } of artistas) {
    // Álbumes
    const { data: albumes } = await supabase
      .from('album_artistas')
      .select('album_id, albumes(titulo, foto_album)')
      .eq('artista_id', artista_id);

    for (const album of albumes) {
      const { data: valoracion } = await supabase
        .from('valoraciones_albumes')
        .select('id_valoracion')
        .eq('usuario', usuarioId)
        .eq('album', album.album_id)
        .maybeSingle();

      if (!valoracion) {
        pendientes.push({
          tipo: 'album',
          id: album.album_id,
          titulo: album.albumes.titulo,
          foto: album.albumes.foto_album,
          artista_id
        });
      }
    }
    // Canciones
    const { data: canciones } = await supabase
      .from('cancion_artistas')
      .select('cancion_id, canciones(titulo)')
      .eq('artista_id', artista_id);

    for (const cancion of canciones) {
      const { data: valoracion } = await supabase
        .from('valoraciones_canciones')
        .select('id_valoracion')
        .eq('usuario', usuarioId)
        .eq('cancion', cancion.cancion_id)
        .maybeSingle();

      if (!valoracion) {
        pendientes.push({
          tipo: 'cancion',
          id: cancion.cancion_id,
          titulo: cancion.canciones.titulo,
          artista_id
        });
      }
    }
    // Videos
    const { data: videos } = await supabase
      .from('video_artistas')
      .select('video_id, videos_musicales(titulo, miniatura)')
      .eq('artista_id', artista_id);

    for (const video of videos) {
      const { data: valoracion } = await supabase
        .from('valoraciones_videos_musicales')
        .select('id_valoracion')
        .eq('usuario', usuarioId)
        .eq('video', video.video_id)
        .maybeSingle();

      if (!valoracion) {
        pendientes.push({
          tipo: 'video',
          id: video.video_id,
          titulo: video.videos_musicales.titulo,
          foto: video.videos_musicales.miniatura,
          artista_id
        });
      }
    }
  }

  res.json(pendientes);
});

module.exports = router;