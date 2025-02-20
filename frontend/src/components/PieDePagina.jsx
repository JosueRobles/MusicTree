import { Link } from 'react-router-dom';

const PieDePagina = () => {
  return (
    <footer style={{ backgroundColor: '#065F46', color: 'white', padding: '1rem', marginTop: '2.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>MusicTree</h3>
          <ul>
            <li><Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Inicio</Link></li>
            <li><Link to="/about" style={{ color: 'white', textDecoration: 'none' }}>Acerca de</Link></li>
            <li><Link to="/contribute" style={{ color: 'white', textDecoration: 'none' }}>Contribuir</Link></li>
          </ul>
        </div>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Legal</h3>
          <ul>
            <li><Link to="/terms" style={{ color: 'white', textDecoration: 'none' }}>Términos de uso</Link></li>
            <li><Link to="/privacy" style={{ color: 'white', textDecoration: 'none' }}>Política de privacidad</Link></li>
            <li><Link to="/community" style={{ color: 'white', textDecoration: 'none' }}>Normas de la comunidad</Link></li>
          </ul>
        </div>
      </div>
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>© 2025 CUCEI. Todos los derechos reservados.</p>
    </footer>
  );
};

export default PieDePagina;