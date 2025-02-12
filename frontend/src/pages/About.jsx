import React from 'react';
import Encabezado from '../components/Encabezado';
import PieDePagina from '../components/PieDePagina';

const About = () => {
  return (
    <div>
      <Encabezado />
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Acerca de MusicTree</h2>
        <p>Explicación detallada sobre MusicTree.</p>
        <p>Misión, visión y objetivos.</p>
        <p>Diferencias con otras plataformas similares.</p>
      </main>
      <PieDePagina />
    </div>
  );
};

export default About;