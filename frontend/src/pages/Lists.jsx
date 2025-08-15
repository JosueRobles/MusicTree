import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

// Tarjeta tipo Spotify/Colecciones
const ListCard = ({ lista, onClick }) => (
  <div
    onClick={onClick}
    style={{
      width: 250,
      height: 100,
      display: 'flex',
      alignItems: 'center',
      background: '#000',
      border: '1px solidrgb(0, 1, 2)',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgb(39, 32, 32)',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s, transform 0.2s',
      overflow: 'hidden',
      position: 'relative',
      marginBottom: 16
    }}
    tabIndex={0}
    onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        onClick();
      }
    }}
    aria-label={`Ver lista ${lista.nombre_lista}`}
    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
  >
    <div style={{
      width: 100,
      height: 100,
      flexShrink: 0,
      background: '#064E3B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'center'
    }}>
      <img
        src={lista.imagen || '/default_playlist.png'}
        alt={lista.nombre_lista}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0, border: '1px solid #ccc' }}
      />
    </div>
    <div style={{
      width: 300,
      height: 100,
      background: '#064E3B',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: 16,
      textAlign: 'center',
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12
    }}>
      {lista.nombre_lista}
    </div>
  </div>
);

// Carrusel para tendencias
const TendenciasCarrusel = ({ tendencias, onCardClick }) => {
  const [pagina, setPagina] = useState(0);
  const porPagina = 10;
  const totalPaginas = Math.ceil(tendencias.length / porPagina);

  const handlePrev = () => setPagina(p => Math.max(0, p - 1));
  const handleNext = () => setPagina(p => Math.min(totalPaginas - 1, p + 1));

  const inicio = pagina * porPagina;
  const fin = inicio + porPagina;
  const tendenciasPagina = tendencias.slice(inicio, fin);

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handlePrev}
          disabled={pagina === 0}
          style={{
            fontSize: 24,
            background: 'none',
            border: 'none',
            cursor: pagina === 0 ? 'not-allowed' : 'pointer',
            color: '#064E3B',
            opacity: pagina === 0 ? 0.3 : 1
          }}
          aria-label="Anterior"
        >
          &#8592;
        </button>
        <div style={{
          display: 'flex',
          gap: 16,
          overflow: 'hidden'
        }}>
          {tendenciasPagina.map(lista => (
            <div key={lista.id_lista} style={{ minWidth: 150 }}>
              <ListCard lista={lista} onClick={() => onCardClick(lista.id_lista)} />
            </div>
          ))}
        </div>
        <button
          onClick={handleNext}
          disabled={pagina === totalPaginas - 1}
          style={{
            fontSize: 24,
            background: 'none',
            border: 'none',
            cursor: pagina === totalPaginas - 1 ? 'not-allowed' : 'pointer',
            color: '#064E3B',
            opacity: pagina === totalPaginas - 1 ? 0.3 : 1
          }}
          aria-label="Siguiente"
        >
          &#8594;
        </button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        Página {pagina + 1} de {totalPaginas}
      </div>
    </div>
  );
};

const Lists = () => {
  const [listas, setListas] = useState([]);
  const [nombreLista, setNombreLista] = useState('');
  const [tipoLista, setTipoLista] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [privacidad, setPrivacidad] = useState('publica'); // Nueva variable de estado para privacidad
  const [tendencias, setTendencias] = useState([]); // Nueva variable de estado para tendencias
  const { usuario } = useContext(UsuarioContext); // Obtener el usuario del contexto
  const [listasGuardadas, setListasGuardadas] = useState([]);
  const [listasColaborativas, setListasColaborativas] = useState([]);
  const [imagen, setImagen] = useState(null);
  const navigate = useNavigate();

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

    const fetchListasGuardadas = async () => {
      if (usuario) {
        try {
          const response = await axios.get(`${API_URL}/listas-personalizadas/guardadas/${usuario.id_usuario}`);
          setListasGuardadas(response.data);
        } catch (error) {
          console.error('Error fetching saved lists:', error);
        }
      }
    };

    const fetchTendencias = async () => {
    try {
      // Quita el params: usuario
      const response = await axios.get(`${API_URL}/tendencias/listas-populares`);
      setTendencias(response.data);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

    const fetchListasColaborativas = async () => {
      if (usuario) {
        try {
          const response = await axios.get(`${API_URL}/listas-personalizadas/colaborativas/${usuario.id_usuario}`);
          setListasColaborativas(response.data);
        } catch (error) {
          console.error('Error fetching collaborative lists:', error);
        }
      }
    };

  fetchListasColaborativas();
  fetchListas();
  fetchListasGuardadas();
  fetchTendencias();
}, [usuario]);

<input
  type="file"
  accept="image/*"
  onChange={e => setImagen(e.target.files[0])}
/>

  const crearLista = async () => {
  if (!nombreLista || !tipoLista) {
    alert('El nombre de la lista y el tipo de lista son obligatorios.');
    return;
  }

  if (!usuario) {
    alert('Debes iniciar sesión para crear una lista.');
    return;
  }

  const formData = new FormData();
  formData.append('userId', usuario.id_usuario);
  formData.append('nombre_lista', nombreLista);
  formData.append('tipo_lista', tipoLista);
  formData.append('descripcion', descripcion);
  formData.append('privacidad', privacidad);
  if (imagen) formData.append('imagen', imagen);

  try {
    const response = await axios.post(`${API_URL}/listas-personalizadas`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setListas([...listas, response.data]);
    setNombreLista('');
    setTipoLista('');
    setDescripcion('');
    setPrivacidad('publica');
    setImagen(null);
  } catch (error) {
    console.error('Error creating list:', error);
    alert('Error al crear la lista');
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
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={e => setImagen(e.target.files[0])}
              />
            </div>
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
                  <ListCard
                    key={lista.id_lista}
                    lista={lista}
                    onClick={() => navigate(`/list/${lista.id_lista}`)}
                  />
                ))}
              </div>
            ) : (
              <p>No tienes listas creadas. Puedes crear una nueva lista arriba.</p>
            )}
          </div>
          <h2>Listas Guardadas</h2>
          <div>
            {listasGuardadas.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                {listasGuardadas.map(lista => (
                  <ListCard
                    key={lista.id_lista}
                    lista={lista}
                    onClick={() => navigate(`/list/${lista.id_lista}`)}
                  />
                ))}
              </div>
            ) : (
              <p>No tienes listas guardadas.</p>
            )}
          </div>
          <h2>Listas en las que colaboras</h2>
          <div>
            {listasColaborativas.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                {listasColaborativas.map(lista => (
                  <ListCard
                    key={lista.id_lista}
                    lista={lista}
                    onClick={() => navigate(`/list/${lista.id_lista}`)}
                  />
                ))}
              </div>
            ) : (
              <p>No colaboras en ninguna lista.</p>
            )}
          </div>
        </>
      ) : (
        <p>Inicia sesión para ver y crear tus listas personalizadas.</p>
      )}
      <h2>Tendencias de Listas</h2>
      <div>
        {tendencias.length > 0 ? (
          <TendenciasCarrusel
            tendencias={tendencias}
            onCardClick={id => navigate(`/list/${id}`)}
          />
        ) : (
          <p>No hay listas en tendencia en este momento.</p>
        )}
      </div>
    </div>
  );
};

export default Lists;