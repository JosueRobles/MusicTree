const express = require('express');
const router = express.Router();
const {
  exportAlbumesForML,
  guardarFeedbackML,
  getClusterGrupo,
  getClusterMiembros
} = require('../controllers/mlController');

router.get('/export/albumes', exportAlbumesForML);
router.post('/feedback', guardarFeedbackML);
router.get('/cluster/album/:id', getClusterGrupo);
router.get('/cluster/album/grupo/:grupo', getClusterMiembros);

module.exports = router;
