import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = 'http://localhost:5000';

const ListPage = () => {
  const { id } = useParams();
  const [lista, setLista] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [detalles, setDetalles] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [privacidad, setPrivacidad] = useState('publica'); // Nueva variable de estado para privacidad
  const [guardada, setGuardada] = useState(false); // Nueva variable de estado para lista guardada
  const { usuario } = useContext(UsuarioContext); // Obtener el usuario del contexto

  useEffect(() => {
    const fetchListaData = async () => {
      try {
        const listaResponse = await axios.get(`${API_URL}/listas-personalizadas/detalle/${id}`, {
          params: { userId: usuario ? usuario.id_usuario : null }
        });
        setLista(listaResponse.data);
        setPrivacidad(listaResponse.data.privacidad);

        const elementosResponse = await axios.get(`${API_URL}/listas-personalizadas/elementos/${id}`);
        setElementos(elementosResponse.data);

        const detallesTemp = {};

        for (const elemento of elementosResponse.data) {
          try {
            let detalleResponse;
            switch (elemento.entidad_tipo) {
              case 'album':
                detalleResponse = await axios.get(`${API_URL}/albumes/${elemento.entidad_id}`);
                detallesTemp[elemento.id_elemento] = detalleResponse.data.album;
                break;
              case 'artista':
                detalleResponse = await axios.get(`${API_URL}/artistas/${elemento.entidad_id}`);
                detallesTemp[elemento.id_elemento] = detalleResponse.data.artista;
                break;
              case 'cancion':
                detalleResponse = await axios.get(`${API_URL}/canciones/${elemento.entidad_id}`);
                detallesTemp[elemento.id_elemento] = detalleResponse.data;
                break;
              case 'video':
                detalleResponse = await axios.get(`${API_URL}/videos/${elemento.entidad_id}`);
                detallesTemp[elemento.id_elemento] = detalleResponse.data;
                break;
              default:
                throw new Error('Tipo de entidad desconocido');
            }
          } catch (detalleError) {
            console.error(`Error fetching ${elemento.entidad_tipo} details:`, detalleError);
            detallesTemp[elemento.id_elemento] = { error: 'No encontrado' };
          }
        }

        setDetalles(detallesTemp);
        setLoading(false);
      } catch (listaError) {
        console.error('Error fetching list data:', listaError);
        setError('Error fetching list data');
        setLoading(false);
      }
    };

    fetchListaData();
  }, [id, usuario]);

  useEffect(() => {
    const verificarListaGuardada = async () => {
      if (usuario) {
        try {
          const response = await axios.get(`${API_URL}/listas-guardadas/verificar`, {
            params: { userId: usuario.id_usuario, listaId: id }
          });
          setGuardada(response.data.guardada);
        } catch (error) {
          console.error('Error al verificar si la lista está guardada:', error);
        }
      }
    };

    verificarListaGuardada();
  }, [id, usuario]);

  const eliminarElemento = async (elementoId) => {
    try {
      await axios.delete(`${API_URL}/listas-personalizadas/elemento/${elementoId}`);
      setElementos(elementos.filter(elemento => elemento.id_elemento !== elementoId));
      setDetalles(prevDetalles => {
        const newDetalles = { ...prevDetalles };
        delete newDetalles[elementoId];
        return newDetalles;
      });
    } catch (error) {
      console.error('Error deleting element:', error);
    }
  };

  const handleGuardarLista = async () => {
    if (!usuario) {
      alert('Debes iniciar sesión para guardar una lista.');
      return;
    }

    try {
      if (guardada) {
        await axios.delete(`${API_URL}/listas-guardadas/eliminar`, {
          data: { userId: usuario.id_usuario, listaId: id }
        });
        setGuardada(false);
        alert('Lista eliminada de guardadas.');
      } else {
        await axios.post(`${API_URL}/listas-guardadas/guardar`, {
          userId: usuario.id_usuario,
          listaId: id
        });
        setGuardada(true);
        alert('Lista guardada correctamente.');
      }
    } catch (error) {
      console.error('Error al guardar/eliminar la lista:', error);
      alert('No se pudo guardar/eliminar la lista.');
    }
  };

  const handlePrivacidadChange = async (newPrivacidad) => {
    try {
      const response = await axios.put(`${API_URL}/listas-personalizadas/${id}`, {
        privacidad: newPrivacidad
      });
      setPrivacidad(response.data.privacidad);
    } catch (error) {
      console.error('Error al cambiar la privacidad:', error);
      alert('No se pudo cambiar la privacidad.');
    }
  };

  return (
    <div>
      {error && <p>{error}</p>}
      {loading && <p>Cargando...</p>}
      {lista && (
        <>
          <h1>{lista.nombre_lista} ({lista.tipo_lista})</h1>
          <p>{lista.descripcion}</p>
          {usuario && lista.usuario_id === usuario.id_usuario && (
            <div>
              <select value={privacidad} onChange={(e) => handlePrivacidadChange(e.target.value)}>
                <option value="publica">Pública</option>
                <option value="privada">Privada</option>
              </select>
            </div>
          )}
          <ul>
            {elementos.map(elemento => (
              <li key={elemento.id_elemento}>
                <Link to={`/${elemento.entidad_tipo}/${elemento.entidad_id}`}>
                  {detalles[elemento.id_elemento] ? (
                    detalles[elemento.id_elemento].error ? (
                      `Entidad ${elemento.entidad_id} no encontrada`
                    ) : (
                      elemento.entidad_tipo === 'cancion' ? 
                        detalles[elemento.id_elemento].titulo :
                        elemento.entidad_tipo === 'album' ? 
                        detalles[elemento.id_elemento].titulo :
                        elemento.entidad_tipo === 'artista' ? 
                        detalles[elemento.id_elemento].nombre_artista :
                        elemento.entidad_tipo === 'video' ? 
                        detalles[elemento.id_elemento].titulo :
                        `Entidad ${elemento.entidad_id}`
                    )
                  ) : (
                    `Cargando...`
                  )}
                </Link>
                {usuario && lista.usuario_id === usuario.id_usuario && (
                  <button onClick={() => eliminarElemento(elemento.id_elemento)}>Eliminar</button>
                )}
              </li>
            ))}
          </ul>
          {usuario && lista.usuario_id !== usuario.id_usuario && (
            <button onClick={handleGuardarLista}>
              {guardada ? 'Eliminar de Guardadas' : 'Guardar Lista'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ListPage;