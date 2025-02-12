import React from 'react';
import { Link } from 'react-router-dom';

const PieDePagina = () => {
  return (
    <footer className="bg-gray-800 text-white p-4 mt-10">
      <div className="flex justify-between">
        <div>
          <h3 className="text-xl font-bold">MusicTree</h3>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/about">Acerca de</Link></li>
            <li><Link to="/contribute">Contribuir</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold">Legal</h3>
          <ul>
            <li><Link to="/terms">Términos de uso</Link></li>
            <li><Link to="/privacy">Política de privacidad</Link></li>
            <li><Link to="/community">Normas de la comunidad</Link></li>
          </ul>
        </div>
      </div>
      <p className="text-center mt-4">© 2025 CUCEI. Todos los derechos reservados.</p>
    </footer>
  );
};

export default PieDePagina;