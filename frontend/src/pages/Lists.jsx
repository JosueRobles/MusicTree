import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev';

const Lists = () => {
  const [listas, setListas] = useState([]);
  const [nombreLista, setNombreLista] = useState('');
  const [tipoLista, setTipoLista] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const userId = 1; // Reemplaza con el ID del usuario autenticado

  useEffect(() => {
    const fetchListas = async () => {
      try {
        const response = await axios.get(`${API_URL}/listas-personalizadas/${userId}`);
        setListas(response.data);
      } catch (error) {
        console.error('Error fetching lists:', error);
      }
    };

    fetchListas();
  }, [userId]);

  const crearLista = async () => {
    try {
      const response = await axios.post(`${API_URL}/listas-personalizadas`, {
        userId,
        nombre_lista: nombreLista,
        tipo_lista: tipoLista,
        descripcion,
      });
      setListas([...listas, response.data]);
      setNombreLista('');
      setTipoLista('');
      setDescripcion('');
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const eliminarLista = async (listaId) => {
    try {
      await axios.delete(`${API_URL}/listas-personalizadas/${listaId}`);
      setListas(listas.filter(lista => lista.id_lista !== listaId));
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  return (
    <div>
      <h1>Mis Listas Personalizadas</h1>
      <div>
        <input
          type="text"
          placeholder="Nombre de la lista"
          value={nombreLista}
          onChange={(e) => setNombreLista(e.target.value)}
        />
        <select value={tipoLista} onChange={(e) => setTipoLista(e.target.value)}>
          <option value="">Selecciona el tipo de lista</option>
          <option value="artista">Artista</option>
          <option value="album">Álbum</option>
          <option value="cancion">Canción</option>
          <option value="video">Video</option>
        </select>
        <textarea
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <button onClick={crearLista}>Crear Lista</button>
      </div>
      <div>
        {listas.length > 0 ? (
          listas.map((lista) => (
            <div key={lista.id_lista}>
              <h2>{lista.nombre_lista} ({lista.tipo_lista})</h2>
              <p>{lista.descripcion}</p>
              <Link to={`/list/${lista.id_lista}`}>Ver Lista</Link>
              <button onClick={() => eliminarLista(lista.id_lista)}>Eliminar Lista</button>
            </div>
          ))
        ) : (
          <p>No tienes listas creadas. Puedes crear una nueva lista arriba.</p>
        )}
      </div>
    </div>
  );
};

export default Lists;