import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = 'http://localhost:5000';

const Lists = () => {
  const [listas, setListas] = useState([]);
  const [nombreLista, setNombreLista] = useState('');
  const [tipoLista, setTipoLista] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [privacidad, setPrivacidad] = useState('publica'); // Nueva variable de estado para privacidad
  const [tendencias, setTendencias] = useState([]); // Nueva variable de estado para tendencias
  const { usuario } = useContext(UsuarioContext); // Obtener el usuario del contexto

  useEffect(() => {
    const fetchListas = async () => {
      if (usuario) {
        try {
          const response = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          setListas(response.data);
        } catch (error) {
          console.error('Error fetching lists:', error);
        }
      }
    };

    const fetchTendencias = async () => {
      try {
        const response = await axios.get(`${API_URL}/tendencias`);
        setTendencias(response.data);
      } catch (error) {
        console.error('Error fetching trends:', error);
      }
    };

    fetchListas();
    fetchTendencias();
  }, [usuario]);

  const crearLista = async () => {
    if (!nombreLista || !tipoLista) {
      alert('El nombre de la lista y el tipo de lista son obligatorios.');
      return;
    }

    if (!usuario) {
      alert('Debes iniciar sesión para crear una lista.');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/listas-personalizadas`, {
        userId: usuario.id_usuario,
        nombre_lista: nombreLista,
        tipo_lista: tipoLista,
        descripcion,
        privacidad, // Agregar privacidad
      });
      setListas([...listas, response.data]);
      setNombreLista('');
      setTipoLista('');
      setDescripcion('');
      setPrivacidad('publica'); // Restablecer privacidad a 'publica'
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
      <p>
        Bienvenido a la sección de listas personalizadas. Aquí puedes crear y gestionar tus propias listas de artistas, álbumes, canciones y videos favoritos.
        Para crear una lista, debes estar registrado e iniciar sesión.
      </p>
      {usuario ? (
        <>
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
            <select value={privacidad} onChange={(e) => setPrivacidad(e.target.value)}>
              <option value="publica">Pública</option>
              <option value="privada">Privada</option>
            </select>
            <button onClick={crearLista}>Crear Lista</button>
          </div>
          <div>
            {listas.length > 0 ? (
              <div>
              {listas.map(lista => (
                <div key={lista.id_lista}>
                  <h2>{lista.nombre_lista} ({lista.tipo_lista})</h2>
                  <p>{lista.descripcion}</p>
                  <p>Popularidad: {lista.saved_count} guardados</p>
                  <Link to={`/list/${lista.id_lista}`}>Ver Lista</Link>
                </div>
              ))}
            </div>
            ) : (
              <p>No tienes listas creadas. Puedes crear una nueva lista arriba.</p>
            )}
          </div>
        </>
      ) : (
        <p>Inicia sesión para ver y crear tus listas personalizadas.</p>
      )}
      <h2>Tendencias de Listas</h2>
      <div>
        {tendencias.length > 0 ? (
          tendencias.map((lista) => (
            <div key={lista.id_lista}>
              <h3>{lista.nombre_lista} ({lista.tipo_lista})</h3>
              <p>{lista.descripcion}</p>
              <Link to={`/list/${lista.id_lista}`}>Ver Lista</Link>
            </div>
          ))
        ) : (
          <p>No hay listas en tendencia en este momento.</p>
        )}
      </div>
    </div>
  );
};

export default Lists;