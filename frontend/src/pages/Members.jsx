import React from 'react';
import Encabezado from '../components/Encabezado';
import PieDePagina from '../components/PieDePagina';

const Members = () => {
  return (
    <div>
      <Encabezado />
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Miembros</h2>
        {/* Implementación de rankings de usuarios */}
      </main>
      <PieDePagina />
    </div>
  );
};

export default Members;