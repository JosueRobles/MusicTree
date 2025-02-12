import React from 'react';
import Encabezado from '../components/Encabezado';
import PieDePagina from '../components/PieDePagina';

const Badges = () => {
  return (
    <div>
      <Encabezado />
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Insignias</h2>
        {/* Implementación de sistema de logros e insignias */}
      </main>
      <PieDePagina />
    </div>
  );
};

export default Badges;