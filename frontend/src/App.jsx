import { useState, useEffect } from 'react';
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
import ProtectedRoute from './components/ProtectedRoute';
import Recommendations from './pages/Recommendations';
import Layout from './components/Layout';
import Profile from './pages/Profile';
import Contribute from './pages/Contribute';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import CommunityRules from './pages/CommunityRules';
import ManageBadges from './pages/ManageBadges'; // Importar el componente de gestión de insignias
import { Routes, Route, Navigate } from 'react-router-dom';
import './styles/globals.css';
import './App.css';

const API_URL = "http://localhost:5000";

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
    <Routes>
      <Route path="/" element={<Layout usuario={usuario} onLogout={handleLogout} />}>
        <Route index element={<Home usuario={usuario} onLogout={handleLogout} />} />
        <Route path="login" element={<Login onLoginExitoso={setUsuario} />} />
        <Route path="register" element={<Register />} />
        <Route path="music" element={<Music />} />
        <Route path="members" element={<Members usuario={usuario || { id_usuario: null }} />} />
        <Route path="badges" element={<Badges usuario={usuario} />} /> {/* Pasar el usuario como prop */}
        <Route path="about" element={<About />} />
        <Route path="album/:id" element={<AlbumPage usuario={usuario} />} />
        <Route path="contribute" element={<Contribute />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="community-rules" element={<CommunityRules />} />
        <Route path="unauthorized" element={<Unauthorized />} />
        <Route path="artist/:id" element={<ArtistPage usuario={usuario} />} />
        <Route path="song/:id" element={<SongPage usuario={usuario} />} />
        <Route path="video/:id" element={<VideoPage usuario={usuario} />} />
        <Route path="lists" element={<Lists />} />
        <Route path="list/:id" element={<ListPage />} />
        <Route path="profile/:id" element={<Profile />} />
        <Route path="recommendations" element={<Recommendations usuario={usuario} />} />
        <Route path="admin" element={
          <ProtectedRoute user={usuario} roles={["admin"]}>
            <div>Panel de Administración</div>
          </ProtectedRoute>
        } />
        <Route path="moderation" element={
          <ProtectedRoute user={usuario} roles={["admin"]}>
            <div>Moderación de Contenido</div>
          </ProtectedRoute>
        } />
        <Route path="manage-badges" element={
          <ProtectedRoute user={usuario} roles={["admin", "moderator"]}>
            <ManageBadges />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;