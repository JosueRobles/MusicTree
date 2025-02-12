import React from 'react';
import Encabezado from '../components/Encabezado';
import PieDePagina from '../components/PieDePagina';
import TendenciasSemanal from '../components/TendenciasSemanal';

const Home = () => {
  return (
    <div>
      <Encabezado />
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Bienvenido a MusicTree</h2>
        <p>Explora artistas, álbumes, canciones y más.</p>
        <TendenciasSemanal />
      </main>
      <PieDePagina />
    </div>
  );
};

export default Home;