import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import logo from '../assets/logo.png';
import BusquedaEncabezado from './BusquedaEncabezado';
import { useEffect, useState } from 'react';

const Encabezado = ({ usuario, onLogout }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noVistas, setNoVistas] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(true);

  useEffect(() => {
    if (usuario) {
      fetch(`${import.meta.env.VITE_API_URL}/notificaciones/usuario/${usuario.id_usuario}`)
        .then(res => res.json())
        .then(data => {
          setNotificaciones(data);
          setNoVistas(data.filter(n => !n.visto).length);
        });
    }
  }, [usuario]);

  return (
    <header style={{
      backgroundColor: '#064E3B',
      color: 'white',
      padding: '1rem',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
        <Link to="/">
          <img src={logo} alt="MusicTree Logo" height={64} width={64} />
        </Link>
        {/* Búsqueda solo en escritorio */}
        <div className="flex-1 hidden md:flex" style={{ alignItems: 'center', display: 'flex' }}>
          <div style={{
            marginLeft: '0.5rem',
            alignItems: 'center',
            marginRight: '1rem',
            minWidth: "15%",
            maxWidth: '10%',
            display: 'flex', // <-- Asegura flex para centrar
          }}>
            <BusquedaEncabezado />
          </div>
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flex: 1,
            fontSize: 20
          }}>
            <Link to="/music" style={{ textDecoration: 'none', color: 'white' }}>Música</Link>
            <Link to="/members" style={{ textDecoration: 'none', color: 'white' }}>Miembros</Link>
            <Link to="/lists" style={{ textDecoration: 'none', color: 'white' }}>Listas</Link>
            <Link to="/badges" style={{ textDecoration: 'none', color: 'white' }}>Insignias</Link>
            <Link to="/collections" style={{ textDecoration: 'none', color: 'white' }}>Colecciones</Link>
            <Link to="/catalogs" style={{ textDecoration: 'none', color: 'white' }}>Catálogos</Link>
            <Link to="/about" style={{ textDecoration: 'none', color: 'white' }}>Acerca de</Link>
            {usuario && (
              <Link to="/notificaciones" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span role="img" aria-label="notificaciones" style={{ fontSize: 22, marginLeft: 8 }}>🔔</span>
                {noVistas > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, background: 'red', color: 'white',
                    borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>{noVistas}</span>
                )}
              </Link>
            )}
            {usuario ? (
        <>
          <Link to={usuario ? `/profile/${usuario.id_usuario}` : '/login'} style={{ backgroundColor: '#3B82F6', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>
            Mi Perfil
          </Link>
          <button onClick={onLogout} style={{ backgroundColor: '#EF4444', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none', border: 'none' }}>Cerrar sesión</button>
        </>
      ) : (
        <>
          <Link to="/login" style={{ backgroundColor: '#3B82F6', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>Iniciar sesión</Link>
          <Link to="/register" style={{ backgroundColor: '#10B981', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>Registrarse</Link>
        </>
      )}
          </nav>
        </div>
        {/* Botón hamburguesa solo en móvil */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 28 }}
        >
          ☰
        </button>
      </div>
      {/* Menú hamburguesa solo en móvil */}
      {menuOpen && (
        <nav className="flex flex-col md:hidden" style={{ background: '#064E3B', width: '100%' }}>
          <div style={{ margin: '0.5rem 1rem', minWidth: 200 }}>
            <BusquedaEncabezado />
          </div>
          <Link to="/music" style={{ textDecoration: 'none', color: 'white' }}>Música</Link>
          <Link to="/members" style={{ textDecoration: 'none', color: 'white' }}>Miembros</Link>
          <Link to="/lists" style={{ textDecoration: 'none', color: 'white' }}>Listas</Link>
          <Link to="/badges" style={{ textDecoration: 'none', color: 'white' }}>Insignias</Link>
          <Link to="/collections" style={{ textDecoration: 'none', color: 'white' }}>Colecciones</Link>
          <Link to="/catalogs" style={{ textDecoration: 'none', color: 'white' }}>Catálogos</Link>
          <Link to="/about" style={{ textDecoration: 'none', color: 'white' }}>Acerca de</Link>
          {usuario && (
            <Link to="/notificaciones" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span role="img" aria-label="notificaciones" style={{ fontSize: 22, marginLeft: 8 }}>🔔</span>
              {noVistas > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4, background: 'red', color: 'white',
                  borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>{noVistas}</span>
              )}
              {usuario ? (
                <>
                  <Link to={usuario ? `/profile/${usuario.id_usuario}` : '/login'} style={{ backgroundColor: '#3B82F6', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>
                    Mi Perfil
                  </Link>
                  <button onClick={onLogout} style={{ backgroundColor: '#EF4444', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none', border: 'none' }}>Cerrar sesión</button>
                </>
              ) : (
                <>
                  <Link to="/login" style={{ backgroundColor: '#3B82F6', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>Iniciar sesión</Link>
                  <Link to="/register" style={{ backgroundColor: '#10B981', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>Registrarse</Link>
                </>
              )}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

Encabezado.propTypes = {
  usuario: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
};

export default Encabezado;