const { 
  importYoutubeCatalog, 
  updateYoutubeCatalog, 
  playlistToCollection, 
  updateCollectionFromYoutubePlaylist, 
  finalizarImportacionYoutube 
} = require('./handlers/youtubeHandler');

const importYoutubeCatalogController = async (req, res) => {
  try {
    await importYoutubeCatalog(req.params.artistId);
    res.status(200).send('Catálogo de YouTube importado correctamente.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al importar catálogo de YouTube.');
  }
};

const updateYoutubeCatalogController = async (req, res) => {
  try {
    await updateYoutubeCatalog(req.params.artistId);
    res.status(200).send('Catálogo de YouTube actualizado correctamente.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar catálogo de YouTube.');
  }
};

const playlistToCollectionController = async (req, res) => {
  try {
    await playlistToCollection(req.params.playlistId);
    res.status(200).send('Colección creada/actualizada desde playlist de YouTube.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear/actualizar colección desde playlist de YouTube.');
  }
};

const updateCollectionFromYoutubePlaylistController = async (req, res) => {
  try {
    await updateCollectionFromYoutubePlaylist(req.params.playlistId, req.params.coleccionId);
    res.status(200).send('Colección actualizada desde playlist de YouTube.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar colección desde playlist de YouTube.');
  }
};

const finalizarImportacionYoutubeController = async (req, res) => {
  try {
    await finalizarImportacionYoutube(req.params.batchId);
    res.status(200).send('Importación finalizada correctamente.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al finalizar importación de YouTube.');
  }
};

module.exports = {
  importYoutubeCatalogController,
  updateYoutubeCatalogController,
  playlistToCollectionController,
  updateCollectionFromYoutubePlaylistController,
  finalizarImportacionYoutubeController,
};