const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const saveData = require('./controllers/spotify/saveData');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS
app.use(cors({
  origin: '*', // Para pruebas, pero en producción usa la URL específica de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(bodyParser.json());

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const artistaRoutes = require("./routes/artistaRoutes");
const albumRoutes = require("./routes/albumRoutes");
const cancionRoutes = require("./routes/cancionRoutes");
const listaRoutes = require("./routes/listaRoutes");
const valoracionRoutes = require("./routes/valoracionRoutes");
const tendenciaRoutes = require("./routes/tendenciaRoutes");
const votacionRoutes = require("./routes/votacionRoutes");
const spotifyRoutes = require("./routes/spotifyRoutes");
const albumArtistasRoutes = require("./routes/albumArtistasRoutes");
const videoRoutes = require("./routes/videoRoutes");
const albumCancionesRoutes = require('./routes/albumCancionesRoutes');
const artistasCancionRoutes = require('./routes/artistasCancionRoutes');
const cancionAlbumRoutes = require('./routes/cancionAlbumRoutes');
const artistasAlbumRoutes = require('./routes/artistasAlbumRoutes');
const cancionArtistasRoutes = require('./routes/cancionArtistasRoutes');
const artistasVideoRoutes = require('./routes/artistasVideoRoutes');
const listaPersonalizadaRoutes = require('./routes/listaPersonalizadaRoutes');

app.use("/auth", authRoutes);
app.use("/usuarios", userRoutes);
app.use("/artistas", artistaRoutes);
app.use("/albumes", albumRoutes);
app.use("/canciones", cancionRoutes);
app.use("/listas", listaRoutes);
app.use("/valoraciones", valoracionRoutes);
app.use("/tendencias", tendenciaRoutes);
app.use("/votaciones", votacionRoutes);
app.use("/spotify", spotifyRoutes);
app.use("/album_artistas", albumArtistasRoutes);
app.use("/videos", videoRoutes);
app.use('/canciones_album', albumCancionesRoutes);
app.use('/artistas_cancion', artistasCancionRoutes);
app.use('/album_cancion', cancionAlbumRoutes);
app.use('/artistas_album', artistasAlbumRoutes);
app.use('/cancion_artistas', cancionArtistasRoutes);
app.use('/artistas_video', artistasVideoRoutes);
app.use('/listas-personalizadas', listaPersonalizadaRoutes);

app.get("/", (req, res) => {
  res.send("MusicTree API funcionando 🚀");
});

app.get('/populate', async (req, res) => {
  try {
    await saveData('pop');
    res.send('Datos de artistas, álbumes y canciones almacenados correctamente');
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
    res.status(500).send('Error al poblar la base de datos');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
