import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import logo from '../assets/logo.png';

const Encabezado = ({ usuario, onLogout }) => {
  return (
    <header style={{ backgroundColor: '#064E3B', color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/">
          <img src={logo} alt="MusicTree Logo" height={32} width={32} />
        </Link>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/music" style={{ textDecoration: 'none', color: 'white' }}>Música</Link>
          <Link to="/members" style={{ textDecoration: 'none', color: 'white' }}>Miembros</Link>
          <Link to="/lists" style={{ textDecoration: 'none', color: 'white' }}>Listas</Link>
          <Link to="/badges" style={{ textDecoration: 'none', color: 'white' }}>Insignias</Link>
          <Link to="/about" style={{ textDecoration: 'none', color: 'white' }}>Acerca de</Link>
        </nav>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {usuario ? (
          <button onClick={onLogout} style={{ backgroundColor: '#EF4444', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none', border: 'none' }}>Cerrar sesión</button>
        ) : (
          <>
            <Link to="/login" style={{ backgroundColor: '#3B82F6', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>Iniciar sesión</Link>
            <Link to="/register" style={{ backgroundColor: '#10B981', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', textDecoration: 'none' }}>Registrarse</Link>
          </>
        )}
      </div>
    </header>
  );
};

Encabezado.propTypes = {
  usuario: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
};

export default Encabezado;