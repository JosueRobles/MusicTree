import React from 'react';
import Encabezado from '../components/Encabezado';
import PieDePagina from '../components/PieDePagina';

const Lists = () => {
  return (
    <div>
      <Encabezado />
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Listas</h2>
        {/* Implementación de creación y visualización de listas */}
      </main>
      <PieDePagina />
    </div>
  );
};

export default Lists;