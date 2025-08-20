const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Carpeta donde se guardarán los archivos
const path = require('path');
const { spotifyApi, setTokens, initializeToken } = require("./controllers/config/spotifyAuth");
const { generateClientCredentialsToken } = require("./controllers/config/spotifyAuth");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

async function initializeServer() {
  try {
    // Generate and set client credentials token
    await generateClientCredentialsToken();
    await initializeToken(); // Ensure token is initialized before starting server

    // Middleware and routes setup
    app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json());
    //app.use(bodyParser.json());

    // Servir la carpeta 'uploads' como estática
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Define routes
    const authRoutes = require("./routes/authRoutes");
    const userRoutes = require("./routes/userRoutes");
    const artistaRoutes = require("./routes/artistaRoutes");
    const albumRoutes = require("./routes/albumRoutes");
    const cancionRoutes = require("./routes/cancionRoutes");
    const valoracionRoutes = require("./routes/valoracionRoutes");
    const tendenciaRoutes = require("./routes/tendenciaRoutes");
    const votacionRoutes = require("./routes/votacionRoutes");
    const spotifyRoutes = require("./routes/spotifyRoutes");
    const videoRoutes = require("./routes/videoRoutes");
    const listaPersonalizadaRoutes = require('./routes/listaPersonalizadaRoutes');
    const rankingUsuarioRoutes = require('./routes/rankingUsuariosRoutes');
    const emocionesRoutes = require('./routes/emocionesRoutes');
    const insigniasRoutes = require('./routes/insigniasRoutes');
    const lastfmRoutes = require('./routes/lastfmRoutes');
    const generosRoutes = require('./routes/generosRoutes'); // Importa las rutas de géneros
    const artistasRelacionesRoutes = require('./routes/artistasRelacionesRoutes');
    const albumCancionRelacionesRoutes = require('./routes/albumCancionRelacionesRoutes');
    const vistasRoutes = require('./routes/vistasRoutes');
    const filtrarRoutes = require('./routes/filtrarRoutes');
    const coleccionesRoutes = require('./routes/coleccionesRoutes');
    const generosRelacionesRoutes = require('./routes/generosRelacionesRoutes');
    const feedRoutes = require('./routes/feedRoutes');
    const feedActivityRoutes = require('./routes/feedActivityRoutes');
    const rankingRoutes = require('./routes/rankingRoutes');
    const catalogosRoutes = require('./routes/catalogosRoutes');
    const notificacionesRoutes = require('./routes/notificacionesRoutes');
    const familiaridadRoutes = require('./routes/familiaridadRoutes');
    const youtubeRoutes = require('./routes/youtubeRoutes');   
    const shareRoutes = require('./routes/shareRoutes');
    const mlRoutes = require('./routes/mlRoutes');

    app.use("/auth", authRoutes);
    app.use("/usuarios", userRoutes);
    app.use("/artistas", artistaRoutes);
    app.use("/albumes", albumRoutes);
    app.use("/canciones", cancionRoutes);
    app.use("/valoraciones", valoracionRoutes);
    app.use("/tendencias", tendenciaRoutes);
    app.use("/votaciones", votacionRoutes);
    app.use("/spotify", spotifyRoutes);
    app.use("/videos", videoRoutes);
    app.use('/listas-personalizadas', listaPersonalizadaRoutes);
    app.use("/ranking", rankingUsuarioRoutes);
    app.use("/emociones", emocionesRoutes);
    app.use("/insignias", insigniasRoutes);
    app.use('/lastfm', lastfmRoutes);
    app.use('/generos', generosRoutes); // Registra las rutas de géneros
    app.use('/relaciones', artistasRelacionesRoutes);
    app.use('/relaciones', albumCancionRelacionesRoutes);
    app.use('/vistas', vistasRoutes);
    app.use('/', filtrarRoutes);
    app.use('/colecciones', coleccionesRoutes);
    app.use('/relaciones', generosRelacionesRoutes);
    app.use('/feed', feedRoutes);
    app.use('/', feedActivityRoutes);
    app.use("/rankings", rankingRoutes);
    app.use('/catalogos', catalogosRoutes);
    app.use('/notificaciones', notificacionesRoutes);
    app.use('/familiaridad', familiaridadRoutes);
    app.use('/youtube', youtubeRoutes);
    app.use('/share', shareRoutes);
    app.use('/ml', mlRoutes);

    // Ruta para iniciar la autenticación de Spotify
    app.get('/login', (req, res) => {
      const authorizeURL = spotifyApi.createAuthorizeURL(
        ['user-library-read', 'playlist-read-private'], // Permisos que necesitas
        'state' // Un estado opcional para validar el flujo
      );
      res.redirect(authorizeURL);
    });

    // Ruta de callback para recibir el token de Spotify
    app.get('/callback', async (req, res) => {
      const { code } = req.query;

      try {
        // Intercambia el código por tokens
        const data = await spotifyApi.authorizationCodeGrant(code);
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];

        // Guarda los tokens
        setTokens(accessToken, refreshToken);

        // Inicializa el token en la API
        await initializeToken();

        res.send("Autenticación exitosa. Puedes cerrar esta ventana.");
      } catch (err) {
        console.error("Error al obtener el token:", err);
        res.status(400).send("Error al obtener el token de acceso.");
      }
    });

    // Ruta de prueba para obtener el perfil del usuario
    app.get('/user', async (req, res) => {
      try {
        const data = await spotifyApi.getMe(); // Llama a Spotify para obtener datos del usuario
        res.json(data.body);
      } catch (err) {
        console.error("Error al obtener datos del usuario:", err);
        res.status(400).send("Error al obtener datos del usuario.");
      }
    });

    app.get("/", (req, res) => {
      res.send("MusicTree API funcionando 🚀");
    });

      app.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
      });

  } catch (err) {
    console.error("Error al inicializar el servidor:", err);
  }
}

// Start the server
initializeServer();
