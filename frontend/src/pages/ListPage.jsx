import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev';

const ListPage = () => {
  const { id } = useParams();
  const [lista, setLista] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [detalles, setDetalles] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListaData = async () => {
      try {
        const listaResponse = await axios.get(`${API_URL}/listas-personalizadas/detalle/${id}`);
        setLista(listaResponse.data);

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
  }, [id]);

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

  return (
    <div>
      {error && <p>{error}</p>}
      {loading && <p>Cargando...</p>}
      {lista && (
        <>
          <h1>{lista.nombre_lista} ({lista.tipo_lista})</h1>
          <p>{lista.descripcion}</p>
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
                <button onClick={() => eliminarElemento(elemento.id_elemento)}>Eliminar</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default ListPage;