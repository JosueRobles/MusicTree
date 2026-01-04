import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const API_URL = import.meta.env.VITE_API_URL;

const Members = ({ usuario }) => {
  const [rankingCombinado, setRankingCombinado] = useState([]);
  const [insigniasPorUsuario, setInsigniasPorUsuario] = useState({});
  const [siguiendoArtistas, setSiguiendoArtistas] = useState({});
  const [siguiendoUsuarios, setSiguiendoUsuarios] = useState({});

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await axios.get(`${API_URL}/ranking/ranking-combinado`);
        setRankingCombinado(response.data);

        // Insignias
        const insigniasPromises = response.data.map(member =>
          axios.get(`${API_URL}/insignias/usuario/${member.id_usuario}`)
        );
        const insigniasResults = await Promise.all(insigniasPromises);
        const insigniasMap = {};
          response.data.forEach((member, idx) => {
            // Filtrar solo insignias completadas
            const completadas = insigniasResults[idx].data.filter(insignia => insignia.progreso === 100);
            insigniasMap[member.id_usuario] = completadas.length;
          });
        setInsigniasPorUsuario(insigniasMap);

        // Artistas seguidos y usuarios seguidos
        const artistasPromises = response.data.map(member =>
          axios.get(`${API_URL}/catalogos/artistas-seguidos/${member.id_usuario}`)
        );
        const usuariosPromises = response.data.map(member =>
          axios.get(`${API_URL}/ranking/${member.id_usuario}/siguiendo?tipo=usuario`)
        );
        const artistasResults = await Promise.all(artistasPromises);
        const usuariosResults = await Promise.all(usuariosPromises);
        const artistasMap = {};
        const usuariosMap = {};
        response.data.forEach((member, idx) => {
          artistasMap[member.id_usuario] = artistasResults[idx].data.length;
          usuariosMap[member.id_usuario] = usuariosResults[idx].data.length;
        });
        setSiguiendoArtistas(artistasMap);
        setSiguiendoUsuarios(usuariosMap);
      } catch (error) {
        console.error('Error fetching ranking data:', error);
      }
    };

    fetchRanking();
  }, [usuario]);

  // Encuentra la posición del usuario actual
  let miPosicion = null;
  if (usuario && rankingCombinado.length > 0) {
    miPosicion = rankingCombinado.findIndex(m => m.id_usuario === usuario.id_usuario);
    if (miPosicion !== -1) miPosicion += 1;
    else miPosicion = null;
  }

  return (
    <div>
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4 text-center">Miembros</h2>
        <div className="section">
          <h3 className="text-2xl font-bold my-4 text-center">Ranking de Actividad</h3>
          {usuario && miPosicion && (
            <div className="text-lg font-semibold mb-4 text-center" style={{ color: "#16a34a" }}>
              Estas en la posición: <b>{miPosicion}</b> en el ranking de Actividad
            </div>
          )}

          {isMobile ? (
            // Mobile: tarjetas apiladas
            <div className="members-mobile-list" style={{ display: 'grid', gap: 12 }}>
              {rankingCombinado.map((member, idx) => (
                <article key={member.id_usuario} className="member-card" style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  background: '#18181b',
                  borderRadius: 12,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.4)'
                }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <Link to={`/profile/${member.id_usuario}`} aria-label={`Ver perfil de ${member.username}`}>
                      <img
                        src={member.foto_perfil || '/default-profile.png'}
                        alt={member.username}
                        loading="lazy"
                        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #16a34a' }}
                      />
                    </Link>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Link to={`/profile/${member.id_usuario}`} className="text-lg font-bold" style={{ color: '#60a5fa' }}>
                      {member.username}
                    </Link>
                    <div style={{ color: '#cbd5e1', fontSize: 14 }}>{member.nombre}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 13, color: '#9ca3af' }}>
                      <div>Seguidores: {member.seguidores_count}</div>
                      <div>Seguidos: {siguiendoUsuarios[member.id_usuario] || 0}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 72 }}>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>{member.actividad_count}</div>
                    <div style={{ fontSize: 12, color: '#ffd700' }}>{insigniasPorUsuario[member.id_usuario] || 0} 🏅</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            // Desktop: tabla (existente)
            <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
              <table style={{
                minWidth: 1100,
                width: '90%',
                maxWidth: 1200,
                margin: 'auto',
                borderCollapse: 'collapse',
                background: '#18181b',
                color: '#fff',
                borderRadius: 16,
                fontSize: '1.15rem'
              }}>
                <thead>
                  <tr style={{ background: '#134e4a' }}>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>#</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Foto</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Username</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Nombre</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Seguidores</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Seguidos</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Artistas seguidos</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Actividad</th>
                    <th style={{ padding: 14, borderBottom: '2px solid #222' }}>Insignias</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingCombinado.map((member, idx) => (
                    <tr key={member.id_usuario} style={{ borderBottom: '1px solid #222', textAlign: 'center', height: 70 }}>
                      <td style={{ padding: 10, fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: 10 }}>
                        <img
                          src={member.foto_perfil || '/default-profile.png'}
                          alt={member.username}
                          loading="lazy"
                          style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #16a34a', background: '#222' }}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <Link to={`/profile/${member.id_usuario}`} className="text-lg font-bold" style={{ color: '#60a5fa' }}>
                          {member.username}
                        </Link>
                      </td>
                      <td style={{ padding: 10 }}>{member.nombre}</td>
                      <td style={{ padding: 10 }}>{member.seguidores_count}</td>
                      <td style={{ padding: 10 }}>{siguiendoUsuarios[member.id_usuario] || 0}</td>
                      <td style={{ padding: 10 }}>{siguiendoArtistas[member.id_usuario] || 0}</td>
                      <td style={{ padding: 10 }}>
                        {member.actividad_count}
                      </td>
                      <td style={{ padding: 10 }}>
                        {insigniasPorUsuario[member.id_usuario] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

Members.propTypes = {
  usuario: PropTypes.shape({
    id_usuario: PropTypes.number,
    nombre: PropTypes.string,
    username: PropTypes.string,
  }),
};

export default Members;
