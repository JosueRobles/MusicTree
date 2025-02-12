const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const PORT = process.env.PORT || 5000;
// Importar rutas
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const artistaRoutes = require("./routes/artistaRoutes");
const albumRoutes = require("./routes/albumRoutes");
const cancionRoutes = require("./routes/cancionRoutes");
const listaRoutes = require("./routes/listaRoutes");
const valoracionRoutes = require("./routes/valoracionRoutes");
const tendenciaRoutes = require("./routes/tendenciaRoutes");
const votacionRoutes = require("./routes/votacionRoutes");

dotenv.config();

// Middleware para parsear JSON
app.use(express.json());
app.use(cors())

// Usar rutas
app.use("/auth", authRoutes);
app.use("/usuarios", userRoutes);
app.use("/artistas", artistaRoutes);
app.use("/albumes", albumRoutes);
app.use("/canciones", cancionRoutes);
app.use("/listas", listaRoutes);
app.use("/valoraciones", valoracionRoutes);
app.use("/tendencias", tendenciaRoutes);
app.use("/votaciones", votacionRoutes);

app.get("/", (req, res) => {
  res.send("MusicTree API funcionando 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});