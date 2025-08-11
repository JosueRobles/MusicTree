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
import Layout from './components/Layout';
import Profile from './pages/Profile';
import Contribute from './pages/Contribute';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import CommunityRules from './pages/CommunityRules';
import Colecciones from './pages/Colecciones'; // Importar la nueva página
import ManageBadges from './pages/ManageBadges'; // Importar el componente de gestión de insignias
import ColeccionPage from './pages/ColeccionPage'; // Importar la nueva página
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ColaboradoresPage from './pages/ColaboradoresPage';
import Notificaciones from './pages/Notificaciones';
import GenrePage from './pages/GenrePage';
import BadgePage from './pages/BadgePage';
import ShareablePage from './pages/ShareablePage';
import InsigniaToast from './components/InsigniaToast';
import Personalizacion from './pages/Personalizacion'; // Importar la página de personalización

import './styles/globals.css';
import './App.css';

const API_URL = "http://localhost:5000";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [toastInsignia, setToastInsignia] = useState(null);
  const [toastNotificacionId, setToastNotificacionId] = useState(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const location = useLocation();

  // Verificar si el audio está disponible
  useEffect(() => {
    // Precargar el audio para evitar problemas de reproducción
    const audio = new Audio("/insigniaSound.mp3");
    audio.preload = "auto";
  }, []);

  useEffect(() => {
    const fetchUsuario = async () => {
      setCargandoUsuario(true);
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/usuarios/current-user`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          setUsuario(response.data);
        } catch (error) {
          console.error("Error al obtener los datos del usuario:", error);
          setUsuario(null); // Manejar el caso donde no se pueda obtener el usuario
        }
      } else {
        setUsuario(null); // No hay token, por lo tanto no hay usuario
      }
      setCargandoUsuario(false);
    };
    fetchUsuario();
  }, []);

  // Comprobar insignias en cada navegación y periódicamente
  useEffect(() => {
    if (!usuario || cargandoUsuario) return;
    
    const checkBadges = async () => {
      try {
        // Comprobar insignias y actualizar progreso
        await axios.get(`${API_URL}/insignias/progreso/${usuario.id_usuario}`);
        
        // Buscar notificaciones no vistas de insignias
        const notifRes = await axios.get(`${API_URL}/notificaciones/usuario/${usuario.id_usuario}`);
        
        if (Array.isArray(notifRes.data)) {
          // Filtrar solo notificaciones de insignias obtenidas no vistas
          const nuevasInsignias = notifRes.data.filter(n => 
            n.tipo_notificacion === 'insignia_obtenida' && !n.visto
          );
          
          if (nuevasInsignias.length > 0) {
            // Tomar la primera notificación
            const notif = nuevasInsignias[0];
            try {
              // Obtener detalles de la insignia
              const insigniaRes = await axios.get(`${API_URL}/insignias/${notif.entidad_id}`);
              if (insigniaRes.data) {
                setToastInsignia(insigniaRes.data);
                setToastNotificacionId(notif.id_notificacion);
              }
            } catch (error) {
              console.error("Error al obtener detalles de la insignia:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error al verificar insignias:", error);
      }
    };
    
    // Verificar al cambiar de ruta
    checkBadges();
    
    // También verificar periódicamente
    const interval = setInterval(checkBadges, 10000); // Cada 10 segundos
    return () => clearInterval(interval);
  }, [usuario, location.pathname, cargandoUsuario]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
  };

  // Desbloquea el contexto de audio en el primer clic
  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio("/insigniaSound.mp3");
      audio.volume = 0;
      audio.play().catch(() => {});
      window.removeEventListener("click", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  return (
    <>
      <InsigniaToast
        visible={!!toastInsignia}
        insignia={toastInsignia}
        notificacionId={toastNotificacionId}
        onClose={() => {
          setToastInsignia(null);
          setToastNotificacionId(null);
        }}
      />
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
          <Route path="collections" element={<Colecciones />} /> {/* Nueva ruta */}
          <Route path="collection/:id" element={<ColeccionPage />} /> {/* Nueva ruta */}
          <Route path="list/:id/colaboradores" element={<ColaboradoresPage />} />
          <Route path="notificaciones" element={<Notificaciones />} />
          <Route path="genre/:id" element={<GenrePage />} />
          <Route path="badge/:id" element={<BadgePage usuario={usuario} />} />
          <Route path="shareable" element={
            <ShareablePage usuario={usuario} hideLayout={true} />
          } />
          <Route path="/personalizacion" element={<Personalizacion />} /> {/* Nueva ruta para personalización */}
          
          {/* Rutas protegidas */}
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
    </>
  );
}

export default App;