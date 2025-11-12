import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import logo from '../assets/logo.png';
import BusquedaEncabezado from './BusquedaEncabezado';
import { useEffect, useState } from 'react';

const Encabezado = ({ usuario, onLogout }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noVistas, setNoVistas] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (usuario) {
      fetch(`${import.meta.env.VITE_API_URL}/notificaciones/usuario/${usuario.id_usuario}`)
        .then(res => res.json())
        .then(data => {
          setNotificaciones(data);
          setNoVistas(data.filter(n => !n.visto).length);
        }).catch(()=>{});
    }
  }, [usuario]);

  // Bloquear scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header className="site-header" role="banner">
      <div className="header-left">
        <nav className="header-nav" role="navigation" aria-label="Main navigation">
          <Link className="encabezado-nav-link" to="/music">Música</Link>
          <Link className="encabezado-nav-link" to="/members">Miembros</Link>
          <Link className="encabezado-nav-link" to="/lists">Listas</Link>
          <Link className="encabezado-nav-link" to="/badges">Insignias</Link>
          <Link className="encabezado-nav-link" to="/collections">Colecciones</Link>
          <Link className="encabezado-nav-link" to="/catalogs">Catálogos</Link>
          <Link className="encabezado-nav-link" to="/about">Acerca de</Link>
        </nav>
      </div>

      <div className="header-center" aria-hidden={false}>
        {/* Contenedor inline: logo (círculo) + búsqueda (a la derecha) */}
        <div className="header-center-inner" role="group" aria-label="Logo y búsqueda">
          <div className="header-logo-circle" aria-hidden>
            <Link to="/" className="header-logo-link" aria-label="MusicTree Home">
              <img src={logo} alt="MusicTree Logo" className="header-logo" />
            </Link>
          </div>

          <div className="header-search-inline" aria-hidden={false}>
            <BusquedaEncabezado />
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-right-inner" role="group" aria-label="Acciones de usuario">
          {usuario && (
            <Link to="/notificaciones" className="encabezado-notif" aria-label="Notificaciones">
              <span className="notif-emoji" aria-hidden>🔔</span>
              {noVistas > 0 && <span className="notif-count" aria-live="polite">{noVistas}</span>}
            </Link>
          )}

          <div className="header-btn-group">
            {usuario ? (
              <>
                <Link to={`/profile/${usuario.id_usuario}`} className="encabezado-btn primary">Mi Perfil</Link>
                <button onClick={onLogout} className="encabezado-btn danger">Cerrar sesión</button>
              </>
            ) : (
              <>
                <Link to="/login" className="encabezado-btn primary">Iniciar sesión</Link>
                <Link to="/register" className="encabezado-btn secondary">Registrarse</Link>
              </>
            )}
          </div>

          <button className="md:hidden header-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div className="mobile-menu md:hidden" role="dialog" aria-label="Menú móvil">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ color: '#fff' }}>Menú</strong>
            <button onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20 }}>✕</button>
          </div>

          {/* Búsqueda en primer lugar */}
          <div style={{ marginBottom: 10 }}>
            <BusquedaEncabezado />
          </div>

          {/* Enlaces verticales (mismas secciones) */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <Link to="/music" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Música</Link>
            <Link to="/members" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Miembros</Link>
            <Link to="/lists" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Listas</Link>
            <Link to="/badges" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Insignias</Link>
            <Link to="/collections" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Colecciones</Link>
            <Link to="/catalogs" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Catálogos</Link>
            <Link to="/about" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Acerca de</Link>
          </nav>

          {/* Acciones de usuario (repetir para mobile) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {usuario ? (
              <>
                <Link to={`/profile/${usuario.id_usuario}`} className="encabezado-btn primary" onClick={() => setMenuOpen(false)}>Mi Perfil</Link>
                <button onClick={() => { onLogout(); setMenuOpen(false); }} className="encabezado-btn danger">Cerrar sesión</button>
              </>
            ) : (
              <>
                <Link to="/login" className="encabezado-btn primary" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
                <Link to="/register" className="encabezado-btn secondary" onClick={() => setMenuOpen(false)}>Registrarse</Link>
              </>
            )}
            <Link to="/notificaciones" className="encabezado-nav-link" onClick={() => setMenuOpen(false)}>Notificaciones</Link>
          </div>
        </div>
      )}
    </header>
  );
};

Encabezado.propTypes = {
  usuario: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
};

export default Encabezado;
