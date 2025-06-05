import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = "http://localhost:5000";

const Colecciones = () => {
  const [colecciones, setColecciones] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchColecciones = async () => {
      try {
        const response = await axios.get(`${API_URL}/colecciones`);
        setColecciones(response.data); // Guardar las colecciones en el estado
      } catch (error) {
        console.error('Error al obtener las colecciones:', error);
        setError('No se pudieron cargar las colecciones.'); // Manejar errores
      }
    };

    fetchColecciones();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Colecciones</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {colecciones.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {colecciones.map((coleccion) => (
            <li key={coleccion.id_coleccion} style={{ marginBottom: '1rem' }}>
              <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '0.5rem' }}>
                <h2>{coleccion.nombre}</h2>
                <p>{coleccion.descripcion}</p>
                <img
                  src={coleccion.icono}
                  alt={coleccion.nombre}
                  style={{ maxWidth: '100px', borderRadius: '0.5rem' }}
                />
                <Link to={`/collection/${coleccion.id_coleccion}`}>Ver Colección</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay colecciones disponibles.</p>
      )}
    </div>
  );
};

export default Colecciones;