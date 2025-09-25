import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = import.meta.env.VITE_API_URL;

const Catalogos = () => {
  const [catalogos, setCatalogos] = useState([]);
  const [error, setError] = useState(null);
  const [masPedidos, setMasPedidos] = useState([]);
  const [votados, setVotados] = useState([]); // IDs de artistas ya votados
  const { usuario } = useContext(UsuarioContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCatalogos = async () => {
      if (!usuario) return;
      try {
        const response = await axios.get(`${API_URL}/catalogos/usuario/${usuario.id_usuario}`);
        // Solo artistas principales
        setCatalogos(response.data.filter(a => a.es_principal));
      } catch (error) {
        setError('No se pudieron cargar los catálogos.');
      }
    };
    fetchCatalogos();
  }, [usuario]);

  useEffect(() => {
    const fetchMasPedidos = async () => {
      try {
        const res = await axios.get(`${API_URL}/catalogos/mas-pedidos`);
        setMasPedidos(res.data);
        if (usuario) {
          // Trae los artistas que ya votó el usuario
          const votos = await axios.get(`${API_URL}/catalogos/votos-usuario/${usuario.id_usuario}`);
          setVotados(votos.data.map(v => v.artista_id));
        }
      } catch (e) {}
    };
    fetchMasPedidos();
  }, [usuario]);

  const handleVotarPedido = async (artista_id) => {
    if (!usuario) return;
    await axios.post(`${API_URL}/catalogos/votar-pedido`, {
      usuario_id: usuario.id_usuario,
      artista_id
    });
    setVotados([...votados, artista_id]);
    // Opcional: recargar masPedidos
  };

  if (!usuario) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Catálogos</h1>
        <p>Debes iniciar sesión para ver los catálogos. Inicia sesión para descubrir y explorar los catálogos disponibles.</p>
      </div>
    );
  }

  // Dimensiones
  const rectWidth = 450;
  const rectHeight = 120;
  const imgSize = 120;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Catálogos</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {catalogos.length > 0 ? (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          justifyContent: 'flex-start'
        }}>
          {catalogos.map((cat) => {
            const completado = cat.progreso >= 100;
            return (
              <div
                key={cat.id_artista}
                onClick={() => navigate(`/artist/${cat.id_artista}`)}
                style={{
                  width: rectWidth,
                  height: rectHeight,
                  display: 'flex',
                  alignItems: 'center',
                  background: completado ? '#fffbe6' : '#fff',
                  border: completado ? '3px solid gold' : '1px solid #e5e7eb',
                  borderRadius: 12,
                  boxShadow: completado
                    ? '0 0 16px 2px gold'
                    : '0 2px 8px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/artist/${cat.id_artista}`);
                  }
                }}
                aria-label={`Ver catálogo de ${cat.nombre_artista}`}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{
                  width: imgSize,
                  height: imgSize,
                  flexShrink: 0,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <img
                    src={cat.foto_artista || '/default_artist.png'}
                    alt={cat.nombre_artista}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: completado ? '2px solid gold' : '1px solid #ccc',
                      boxShadow: completado ? '0 0 8px gold' : 'none'
                    }}
                  />
                  {completado && (
                    <span style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'gold',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: 14,
                      boxShadow: '0 0 6px gold'
                    }}>
                      🏅
                    </span>
                  )}
                </div>
                <div style={{
                  width: rectWidth - imgSize,
                  height: rectHeight,
                  background: '#064E3B',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 16,
                  textAlign: 'center',
                  borderTopRightRadius: 12,
                  borderBottomRightRadius: 12
                }}>
                  {cat.nombre_artista}
                  <div style={{ fontWeight: 400, fontSize: 14, marginTop: 8 }}>
                    Progreso: {cat.progreso?.toFixed(1) || 0}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No hay catálogos disponibles.</p>
      )}
      {masPedidos.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Artistas más pedidos para catálogo completo</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            {masPedidos.map(a => (
              <div key={a.artista_id} style={{
                border: '1px solid #004600ff', borderRadius: 8, padding: '1rem', minWidth: 220, background: '#064E3B'
              }}>
                <img src={a.foto_artista || '/default_artist.png'} alt={a.nombre_artista} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                <div style={{ fontWeight: 600 }}>{a.nombre_artista}</div>
                <div>Votos: {a.votos}</div>
                <button
                  disabled={votados.includes(a.artista_id)}
                  style={{
                    marginTop: 8,
                    background: votados.includes(a.artista_id) ? '#082502ff' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 12px',
                    cursor: votados.includes(a.artista_id) ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => handleVotarPedido(a.artista_id)}
                >
                  {votados.includes(a.artista_id) ? 'Ya votaste' : 'Votar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalogos;