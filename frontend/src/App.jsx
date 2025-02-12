import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Music from './pages/Music';
import Members from './pages/Members';
import Lists from './pages/Lists';
import Badges from './pages/Badges';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import PanelAdmin from './components/PanelAdmin';
import GestionarUsuarios from './components/GestionarUsuarios';
import Encabezado from './components/Encabezado';
import PieDePagina from './components/PieDePagina';
import TendenciasFeed from './components/TendenciasFeed';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './components/Unauthorized';
import './App.css';

const API_URL = "http://localhost:5000";

function App() {
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsuario({ id: payload.id, nombre: "Usuario", tipo_usuario: payload.tipo_usuario });

        axios.get(`${API_URL}/usuarios/${payload.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        .then((res) => {
          setUsuario((prevUsuario) => ({
            ...prevUsuario,
            nombre: res.data.nombre,
          }));
        })
        .catch((err) => {
          localStorage.removeItem('token');
          setUsuario(null);
        });
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
    navigate('/');
  };

  return (
    <div>
      <Encabezado />
      <main className="p-4">
        {usuario ? (
          <div>
            <h2>Bienvenido, {usuario.nombre}</h2>
            <p>Rol: {usuario.tipo_usuario || "Sin Rol"}</p>
            <button onClick={handleLogout} className="bg-red-400 text-white p-2 rounded">Cerrar Sesión</button>

            {usuario.tipo_usuario === "admin" && (
              <div>
                <h3>Panel de Administración</h3>
                <button onClick={() => navigate('/usuarios')} className="bg-red-500 text-white p-2 rounded">Gestionar Usuarios</button>
                <button onClick={() => navigate('/moderacion')} className="bg-blue-500 text-white p-2 rounded ml-2">Moderación de Contenido</button>
              </div>
            )}

            {usuario.tipo_usuario === "moderador" && (
              <div>
                <h3>Panel de Moderación</h3>
                <button className="bg-yellow-500 text-white p-2 rounded">Revisar Reportes</button>
              </div>
            )}

            {usuario.tipo_usuario === "usuario" && (
              <div>
                <h3>Explorar Música</h3>
              </div>
            )}
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login onLoginExitoso={setUsuario} />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}

        <TendenciasFeed />

        <Routes>
          <Route path="/admin" element={
            <ProtectedRoute user={usuario} roles={["admin"]}>
              <PanelAdmin />
            </ProtectedRoute>
          } />
          <Route path="/usuarios" element={
            <ProtectedRoute user={usuario} roles={["admin", "moderador"]}>
              <GestionarUsuarios />
            </ProtectedRoute>
          } />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </main>
      <PieDePagina />
    </div>
  );
}

export default App;