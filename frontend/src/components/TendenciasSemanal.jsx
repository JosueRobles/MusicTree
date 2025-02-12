import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TendenciasSemanal = () => {
  const [tendencias, setTendencias] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTendencias = async () => {
      try {
        const response = await axios.get('http://localhost:5000/tendencias/recientes');
        setTendencias(response.data);
      } catch (error) {
        setError('Error al obtener tendencias');
        console.error('Error al obtener tendencias:', error);
      }
    };
    fetchTendencias();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tendencias de la semana</h2>
      {error && <p className="text-red-500">{error}</p>}
      <ul>
        {tendencias.map((tendencia, index) => (
          <li key={index} className="mb-2">
            {tendencia.accion} en {tendencia.entidad_tipo === 'album' ? tendencia.album?.titulo : tendencia.cancion?.titulo}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TendenciasSemanal;