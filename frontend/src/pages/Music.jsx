import React from 'react';
import Encabezado from '../components/Encabezado';
import PieDePagina from '../components/PieDePagina';
import BarraDeBusqueda from '../components/BarraDeBusqueda';

const Music = () => {
  return (
    <div>
      <Encabezado />
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Música</h2>
        <BarraDeBusqueda />
        {/* Implementación de filtros y tendencias de la semana */}
      </main>
      <PieDePagina />
    </div>
  );
};

export default Music;