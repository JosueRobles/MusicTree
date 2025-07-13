import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import logo from '../assets/logo.png';
import BusquedaEncabezado from './BusquedaEncabezado';
import { useEffect, useState } from 'react';

const Encabezado = ({ usuario, onLogout }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noVistas, setNoVistas] = useState(0);

  useEffect(() => {
    if (usuario) {
      fetch(`http://localhost:5000/notificaciones/usuario/${usuario.id_usuario}`)
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
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flex: 1,
          fontSize: 20
        }}>
          <div style={{ marginLeft: '0.5rem', marginRight: '1rem', minWidth: 260, maxWidth: '320' }}>
            {/* Componente de búsqueda con autocompletado */}
            <BusquedaEncabezado />
          </div>
          <Link to="/music" style={{ textDecoration: 'none', color: 'white' }}>Música</Link>
          <Link to="/members" style={{ textDecoration: 'none', color: 'white' }}>Miembros</Link>
          <Link to="/lists" style={{ textDecoration: 'none', color: 'white' }}>Listas</Link>
          <Link to="/badges" style={{ textDecoration: 'none', color: 'white' }}>Insignias</Link>
          <Link to="/collections" style={{ textDecoration: 'none', color: 'white' }}>Colecciones</Link>
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
    </header>
  );
};

Encabezado.propTypes = {
  usuario: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
};

export default Encabezado;