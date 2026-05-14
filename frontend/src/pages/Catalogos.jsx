import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = import.meta.env.VITE_API_URL;

const Catalogos = () => {
  const [catalogos, setCatalogos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [localResults, setLocalResults] = useState([]);
  const [spotifyResults, setSpotifyResults] = useState([]);
  const [searchingSpotify, setSearchingSpotify] = useState(false);
  const [error, setError] = useState(null);
  const [masPedidos, setMasPedidos] = useState([]);
  const [misPedidos, setMisPedidos] = useState([]);
  const [pedidoOrden, setPedidoOrden] = useState('urgente');
  const [votados, setVotados] = useState([]); // IDs de artistas ya votados
  const [interesMap, setInteresMap] = useState({});
  const { usuario } = useContext(UsuarioContext);
  const navigate = useNavigate();

  useEffect(() => {
    const savedInteres = localStorage.getItem('catalogoInteres');
    if (savedInteres) {
      try {
        setInteresMap(JSON.parse(savedInteres));
      } catch {
        setInteresMap({});
      }
    }
  }, []);

  useEffect(() => {
    const fetchCatalogos = async () => {
      if (!usuario) return;
      try {
        const response = await axios.get(`${API_URL}/catalogos/usuario/${usuario.id_usuario}`);
        const principales = response.data
          .filter(a => a.es_principal)
          .sort((a, b) => (b.progreso || 0) - (a.progreso || 0));
        setCatalogos(principales);
      } catch (err) {
        console.error(err);
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
          const pedidos = await axios.get(`${API_URL}/catalogos/pedidos-usuario/${usuario.id_usuario}`);
          setMisPedidos(pedidos.data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)));
        }
      } catch (err) {
        console.error(err);
      }
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

  const handleInterestChange = (artistaId, nivel) => {
    const next = { ...interesMap, [artistaId]: nivel };
    setInteresMap(next);
    localStorage.setItem('catalogoInteres', JSON.stringify(next));
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

  const interestGroups = [
    { key: 'mucho', label: 'Me interesa mucho' },
    { key: 'interesa', label: 'Me interesa' },
    { key: 'noInteresa', label: 'No me interesa' },
    { key: 'none', label: 'Sin indicar interés' }
  ];

  const groupedCatalogos = interestGroups.reduce((acc, group) => {
    acc[group.key] = [];
    return acc;
  }, {});

  catalogos.forEach(cat => {
    const nivel = interesMap[cat.id_artista];
    const key = nivel === 'mucho'
      ? 'mucho'
      : nivel === 'interes'
        ? 'interesa'
        : nivel === 'no' || nivel === 'no-interesa'
          ? 'noInteresa'
          : 'none';
    groupedCatalogos[key].push(cat);
  });

  Object.values(groupedCatalogos).forEach(group => {
    group.sort((a, b) => (b.progreso || 0) - (a.progreso || 0));
  });

  const formatInterestLabel = (cat) => {
    if (interesMap[cat.id_artista] === 'mucho') return 'Me interesa mucho';
    if (interesMap[cat.id_artista] === 'interes') return 'Me interesa';
    if (interesMap[cat.id_artista] === 'no' || interesMap[cat.id_artista] === 'no-interesa') return 'No me interesa';
    return 'Sin indicar interés';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Catálogos</h1>
      <div style={{ margin: '1rem 0' }}>
        <input
          placeholder="Buscar artista para pedir catálogo..."
          value={searchTerm}
          onChange={async (e) => {
            const t = e.target.value;
            setSearchTerm(t);
            setSpotifyResults([]);
            if (!t) { setLocalResults([]); return; }
            try {
              const res = await axios.get(`${API_URL}/artistas`, { params: { termino: t } });
              setLocalResults(res.data || []);
            } catch {
              setLocalResults([]);
            }
          }}
          style={{ padding: 8, width: '100%', maxWidth: 640, borderRadius: 6, border: '1px solid #ddd' }}
        />

        {searchTerm && (
          <div style={{ marginTop: 8 }}>
            {localResults.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {localResults.map(a => (
                  <div key={a.id_artista} style={{ padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
                    <div style={{ fontWeight: 600 }}>{a.nombre_artista}</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      <button onClick={() => navigate(`/artist/${a.id_artista}`)}>Ver</button>
                      <button style={{ marginLeft: 8 }} onClick={() => handleVotarPedido(a.id_artista)} disabled={!usuario}>Pedir catálogo</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <button
                  onClick={async () => {
                    if (!searchTerm) return;
                    setSearchingSpotify(true);
                    try {
                      const res = await axios.post(`${API_URL}/catalogos/search-spotify`, { term: searchTerm });
                      setSpotifyResults(res.data || []);
                    } catch {
                      setSpotifyResults([]);
                    } finally {
                      setSearchingSpotify(false);
                    }
                  }}
                >
                  {searchingSpotify ? 'Buscando en Spotify...' : 'Buscar en Spotify'}
                </button>
                {spotifyResults.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {spotifyResults.map(s => (
                      <div key={s.spotify_id} style={{ padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
                        <div style={{ fontWeight: 700 }}>{s.nombre}</div>
                        <div style={{ fontSize: 12, marginTop: 6 }}>
                          <button onClick={async () => {
                            try {
                              const createRes = await axios.post(`${API_URL}/catalogos/create-artist`, { spotify_id: s.spotify_id, usuario_id: usuario?.id_usuario });
                              const created = createRes.data;
                              // intentar votar automáticamente
                              if (usuario && (created.id_artista || created.id)) {
                                const artistId = created.id_artista || created.id;
                                await axios.post(`${API_URL}/catalogos/votar-pedido`, { usuario_id: usuario.id_usuario, artista_id: artistId });
                                setVotados(prev => [...prev, artistId]);
                              }
                              // refrescar catálogos
                              const resp = await axios.get(`${API_URL}/catalogos/usuario/${usuario.id_usuario}`);
                              setCatalogos(resp.data.filter(a => a.es_principal).sort((a, b) => (b.progreso || 0) - (a.progreso || 0)));
                              setSearchTerm('');
                              setLocalResults([]);
                              setSpotifyResults([]);
                            } catch (err) {
                              console.error('Error creating artist:', err);
                            }
                          }}>Crear y pedir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {catalogos.length > 0 ? (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <strong>Ordenar catálogos por:</strong>
            <span style={{ padding: '0.5rem 0.75rem', background: '#064E3B', color: '#fff', borderRadius: 6 }}>
              Progreso de catálogo
            </span>
            <span style={{ color: '#444' }}>
              Aquí están primero los catálogos con mayor porcentaje de avance.
            </span>
          </div>

          {interestGroups.map(group => (
            <div key={group.key} style={{ marginBottom: '2rem' }}>
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>{group.label}</h2>
                <span style={{ color: '#475569' }}>({groupedCatalogos[group.key].length})</span>
              </div>
              {groupedCatalogos[group.key].length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                  {groupedCatalogos[group.key].map((cat) => {
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
                          borderBottomRightRadius: 12,
                          padding: 12,
                          boxSizing: 'border-box'
                        }}>
                          {cat.nombre_artista}
                          <div style={{ fontWeight: 400, fontSize: 14, marginTop: 8 }}>
                            Progreso: {cat.progreso?.toFixed(1) || 0}%
                          </div>
                          <div style={{ marginTop: 10, fontSize: 13, color: '#d1fae5' }}>
                            Interés: {formatInterestLabel(cat)}
                          </div>
                          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['no', 'interes', 'mucho'].map(level => {
                              const labels = { no: 'No me interesa', interes: 'Me interesa', mucho: 'Me interesa mucho' };
                              return (
                                <button
                                  key={level}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInterestChange(cat.id_artista, level);
                                  }}
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: interesMap[cat.id_artista] === level ? '#10b981' : '#065f46',
                                    color: 'white',
                                    fontSize: 12
                                  }}
                                >
                                  {labels[level]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#64748b', margin: 0 }}>No hay catálogos en esta categoría.</p>
              )}
            </div>
          ))}
        </>
      ) : null}
      {usuario && misPedidos.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Mis solicitudes de catálogos</h2>
          <p style={{ marginBottom: '0.75rem', color: '#475569' }}>Mostrando tus solicitudes más antiguas primero.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {misPedidos.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/artist/${p.artista_id}`)}
                style={{
                  border: '1px solid #0f766e',
                  borderRadius: 8,
                  padding: '1rem',
                  minWidth: 220,
                  background: '#0f766e1a',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={p.foto_artista || '/default_artist.png'}
                    alt={p.nombre_artista}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.nombre_artista}</div>
                    <div style={{ fontSize: 12, color: '#334155' }}>Solicitado el {new Date(p.fecha).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {masPedidos.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h2>Artistas más pedidos para catálogo completo</h2>
            <div>
              <label style={{ marginRight: 8 }}>Orden:</label>
              <select value={pedidoOrden} onChange={e => setPedidoOrden(e.target.value)}>
                <option value="urgente">Más pedidos primero</option>
                <option value="mis-antiguos">Mis solicitudes antiguas</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            {masPedidos.map(a => (
              <div
                key={a.artista_id}
                onClick={() => navigate(`/artist/${a.artista_id}`)}
                style={{
                  border: '1px solid #004600ff',
                  borderRadius: 8,
                  padding: '1rem',
                  minWidth: 220,
                  background: '#064E3B',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <img
                  src={a.foto_artista || '/default_artist.png'}
                  alt={a.nombre_artista}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/artist/${a.artista_id}`);
                  }}
                />
                <div
                  style={{ fontWeight: 600, marginTop: 8, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/artist/${a.artista_id}`);
                  }}
                >
                  {a.nombre_artista}
                </div>
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