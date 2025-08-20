const express = require('express');
const router = express.Router();
const {
  exportCancionesForML,
  exportAlbumesForML,
  exportVideosForML,
  guardarFeedbackML,
  sugerirSimilares,
  getClusterGrupo,
  getClusterMiembros
} = require('../controllers/mlController');

router.get('/export/canciones', exportCancionesForML);
router.get('/export/albumes', exportAlbumesForML);
router.get('/export/videos', exportVideosForML);

router.post('/feedback', guardarFeedbackML);
router.get('/sugerencias/:entidad/:id', sugerirSimilares);
router.get('/cluster/:entidad/:id', getClusterGrupo);
router.get('/cluster/:entidad/grupo/:grupo', getClusterMiembros);

module.exports = router;
