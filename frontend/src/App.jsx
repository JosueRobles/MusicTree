import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Music from './pages/Music';
import Members from './pages/Members';
import Lists from './pages/Lists';
import Badges from './pages/Badges';
import About from './pages/About';
import Login from './pages/Login';
import ListPage from './pages/ListPage';
import Register from './pages/Register';
import AlbumPage from './pages/AlbumPage';
import Unauthorized from './pages/Unauthorized';
import ArtistPage from './pages/ArtistPage';
import SongPage from './pages/SongPage';
import VideoPage from './pages/VideoPage';
import Encabezado from './components/Encabezado';
import PieDePagina from './components/PieDePagina';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/globals.css';
import './App.css';

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const fetchUsuario = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/usuarios/perfil`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          setUsuario(response.data);
        } catch (error) {
          console.error("Error al obtener los datos del usuario:", error);
        }
      }
    };
    fetchUsuario();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
  };

  return (
    <div>
      <Encabezado usuario={usuario} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home usuario={usuario} onLogout={handleLogout} />} />
        <Route path="/login" element={<Login onLoginExitoso={setUsuario} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/music" element={<Music />} />
        <Route path="/members" element={<Members />} />
        <Route path="/badges" element={<Badges />} />
        <Route path="/about" element={<About />} />
        <Route path="/album/:id" element={<AlbumPage usuario={usuario} />} />
        <Route path="/contribute" element={<div>Contribuir</div>} />
        <Route path="/terms" element={<div>Términos de uso</div>} />
        <Route path="/privacy" element={<div>Política de privacidad</div>} />
        <Route path="/community-rules" element={<div>Normas de la comunidad</div>} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/artist/:id" element={<ArtistPage usuario={usuario} />} />
        <Route path="/song/:id" element={<SongPage usuario={usuario} />} />
        <Route path="/video/:id" element={<VideoPage usuario={usuario} />} />
        <Route path="/lists" element={<Lists />} />
        <Route path="/list/:id" element={<ListPage />} />
        <Route path="/admin" element={
          <ProtectedRoute user={usuario} roles={["admin"]}>
            <div>Panel de Administración</div>
          </ProtectedRoute>
        } />
        <Route path="/moderation" element={
          <ProtectedRoute user={usuario} roles={["admin"]}>
            <div>Moderación de Contenido</div>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <PieDePagina />
    </div>
  );
}

export default App;