import React from 'react';
import { Link } from 'react-router-dom';

const Encabezado = () => {
  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <Link to="/">
        <h1 className="text-2xl font-bold">MusicTree</h1>
      </Link>
      <div className="flex space-x-4">
        <Link to="/music" className="hover:underline">Música</Link>
        <Link to="/members" className="hover:underline">Miembros</Link>
        <Link to="/lists" className="hover:underline">Listas</Link>
        <Link to="/badges" className="hover:underline">Insignias</Link>
        <Link to="/about" className="hover:underline">Acerca de</Link>
      </div>
      <div>
        <Link to="/login" className="bg-blue-500 px-3 py-2 rounded text-white">Iniciar sesión</Link>
        <Link to="/register" className="bg-green-500 px-3 py-2 rounded text-white ml-2">Registrarse</Link>
      </div>
    </header>
  );
};

export default Encabezado;