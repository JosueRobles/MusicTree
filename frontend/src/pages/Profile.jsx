import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { UsuarioContext } from '../context/UsuarioContext';
import { Link } from 'react-router-dom';
import ModifyPersonalRanking from '../components/ModifyPersonalRanking';
import UserListGrid from '../components/UserListGrid';
import ValoracionComentarioEntidad from '../components/ValoracionComentarioEntidad';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL;

const Profile = () => {
  const { usuario } = useContext(UsuarioContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [followers, setFollowers] = useState(0);
  const [activity, setActivity] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProfilePic, setNewProfilePic] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [colecciones, setColecciones] = useState([]);
  const [progresos, setProgresos] = useState({});
  const [catalogos, setCatalogos] = useState([]);
  const [usuariosSeguidos, setUsuariosSeguidos] = useState([]);
  const [artistasSeguidos, setArtistasSeguidos] = useState([]);
  const [copied, setCopied] = useState(false);
  const [insignias, setInsignias] = useState([]);
  const [listas, setListas] = useState([]);
  const [valoracionesEnriquecidas, setValoracionesEnriquecidas] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [metodologia, setMetodologia] = useState(null);
  const [following, setFollowing] = useState([]);
  const [valoraciones, setValoraciones] = useState([]);
  const [generosDisponibles, setGenerosDisponibles] = useState([]);


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/ranking/${id}`);
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
  
    const fetchFollowers = async () => {
      try {
        const response = await axios.get(`${API_URL}/ranking/${id}/seguidores`);
        setFollowersList(response.data);
        setFollowers(response.data.length);
      } catch (error) {
        console.error('Error fetching followers:', error);
      }
    };
  
    const fetchActivity = async () => {
      try {
        const response = await axios.get(`${API_URL}/ranking/${id}/actividad`);
        setActivity(response.data.length);
      } catch (error) {
        console.error('Error fetching activity:', error);
      }
    };
  
    const fetchFollowing = async () => {
      try {
        const response = await axios.get(`${API_URL}/catalogos/artistas-seguidos/${id}`);
        setFollowing(response.data);
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };
  
    fetchUser();
    fetchFollowers();
    fetchActivity();
    fetchFollowing();
  }, [id]); // solo [id]

  useEffect(() => {
  // Solo cargar si hay usuario en contexto (para perfil propio) o si hay user.id (para perfil público)
  const userId = usuario && usuario.id_usuario === user?.id_usuario ? usuario.id_usuario : id;
  if (!userId) return;

  const fetchColecciones = async () => {
    try {
      const response = await axios.get(`${API_URL}/colecciones`);
      setColecciones(response.data);
    } catch (e) {}
  };

  const fetchProgresos = async () => {
    try {
      const response = await axios.get(`${API_URL}/colecciones/usuario/${userId}`);
      const progresosObj = {};
      response.data.forEach(item => {
        progresosObj[item.id_coleccion] = item.progreso;
      });
      setProgresos(progresosObj);
    } catch (e) {}
  };
  const fetchCatalogos = async () => {
    try {
      const response = await axios.get(`${API_URL}/catalogos/usuario/${usuario?.id_usuario || id}`);
      setCatalogos(response.data);
    } catch (e) {}
  };
  const fetchUsuariosSeguidos = async () => {
    const res = await axios.get(`${API_URL}/ranking/${id}/siguiendo`);
    setUsuariosSeguidos(res.data);
  };
  const fetchArtistasSeguidos = async () => {
    const res = await axios.get(`${API_URL}/catalogos/artistas-seguidos/${id}`);
    setArtistasSeguidos(res.data);
  };
  fetchCatalogos();
  fetchColecciones();
  fetchProgresos();
  fetchUsuariosSeguidos();
  fetchArtistasSeguidos();
}, [usuario, user, id]);

useEffect(() => {
  // Cargar insignias
  if (user?.id_usuario) {
    axios.get(`${API_URL}/insignias/usuario/${user.id_usuario}`)
      .then(res => setInsignias(res.data.filter(i => i.progreso === 100)));
  }
  async function enrichValoraciones() {
      if (!user?.id_usuario) {
        setValoracionesEnriquecidas([]);
        return;
      }
      // 1. Trae todas las valoraciones del usuario por tipo
      const [artistas, albums, canciones, videos] = await Promise.all([
        axios.get(`${API_URL}/valoraciones?usuario=${user.id_usuario}&entidad_tipo=artista`),
        axios.get(`${API_URL}/valoraciones?usuario=${user.id_usuario}&entidad_tipo=album`),
        axios.get(`${API_URL}/valoraciones?usuario=${user.id_usuario}&entidad_tipo=cancion`),
        axios.get(`${API_URL}/valoraciones?usuario=${user.id_usuario}&entidad_tipo=video`)
      ]);
      // 2. Junta todas y ordénalas por fecha
      const todas = [
        ...artistas.data.map(v => ({ ...v, tipo: 'artista', entidad_id: v.artista })),
        ...albums.data.map(v => ({ ...v, tipo: 'album', entidad_id: v.album })),
        ...canciones.data.map(v => ({ ...v, tipo: 'cancion', entidad_id: v.cancion })),
        ...videos.data.map(v => ({ ...v, tipo: 'video', entidad_id: v.video })),
      ].sort((a, b) => new Date(b.registrado) - new Date(a.registrado));
  
      // 3. Trae info de usuario (solo una vez)
      const usuarioInfo = {
        nombre: user.nombre,
        username: user.username,
        foto_perfil: user.foto_perfil
      };
  
      // 4. Trae info de entidades en lote
      const idsPorTipo = {
        artista: [],
        album: [],
        cancion: [],
        video: []
      };
      todas.forEach(v => {
        if (v.entidad_id) idsPorTipo[v.tipo].push(v.entidad_id);
      });
  
      // Quita duplicados
      Object.keys(idsPorTipo).forEach(tipo => {
        idsPorTipo[tipo] = [...new Set(idsPorTipo[tipo])];
      });
  
      // Fetch entidades en lote
      const [artistasEnt, albumsEnt, cancionesEnt, videosEnt] = await Promise.all([
        idsPorTipo.artista.length
          ? axios.get(`${API_URL}/artistas`, { params: { ids: idsPorTipo.artista.join(',') } }).then(r => r.data)
          : [],
        idsPorTipo.album.length
          ? axios.get(`${API_URL}/albumes`, { params: { ids: idsPorTipo.album.join(',') } }).then(r => r.data)
          : [],
        idsPorTipo.cancion.length
          ? axios.get(`${API_URL}/canciones`, { params: { ids: idsPorTipo.cancion.join(',') } }).then(r => r.data)
          : [],
        idsPorTipo.video.length
          ? axios.get(`${API_URL}/videos`, { params: { ids: idsPorTipo.video.join(',') } }).then(r => r.data)
          : [],
      ]);
  
      // Indexa por id
      const artistasMap = Object.fromEntries(artistasEnt.map(a => [a.id_artista, a]));
      const albumsMap = Object.fromEntries(albumsEnt.map(a => [a.id_album, a]));
      const cancionesMap = Object.fromEntries(cancionesEnt.map(c => [c.id_cancion, c]));
      const videosMap = Object.fromEntries(videosEnt.map(v => [v.id_video, v]));
  
      // 5. Enriquecer cada valoración con emoción y familiaridad
      const enriquecidas = await Promise.all(todas.map(async v => {
        let entidad = {};
        if (v.tipo === 'artista') {
          const a = artistasMap[v.entidad_id];
          entidad = a ? { tipo: 'artista', id: a.id_artista, nombre: a.nombre_artista } : { tipo: 'artista', id: v.entidad_id };
        } else if (v.tipo === 'album') {
          const a = albumsMap[v.entidad_id];
          entidad = a ? { tipo: 'album', id: a.id_album, nombre: a.titulo } : { tipo: 'album', id: v.entidad_id };
        } else if (v.tipo === 'cancion') {
          const c = cancionesMap[v.entidad_id];
          entidad = c ? { tipo: 'cancion', id: c.id_cancion, nombre: c.titulo } : { tipo: 'cancion', id: v.entidad_id };
        } else if (v.tipo === 'video') {
          const vdo = videosMap[v.entidad_id];
          entidad = vdo ? { tipo: 'video', id: vdo.id_video, nombre: vdo.titulo } : { tipo: 'video', id: v.entidad_id };
        }

        // Traer emoción y familiaridad (puedes optimizar con endpoints batch si tienes muchos)
        let emocion = null;
        let familiaridad = null;
        try {
          // Emoción
          const emoRes = await axios.get(`${API_URL}/emociones`, {
            params: { entidad_tipo: v.tipo, entidad_id: v.entidad_id, usuario: user.id_usuario }
          });
          if (Array.isArray(emoRes.data) && emoRes.data.length > 0) {
            emocion = emoRes.data[0].emocion || null;
          }
        } catch {}
        try {
          // Familiaridad
          const famRes = await axios.get(`${API_URL}/familiaridad`, {
            params: { entidad_tipo: v.tipo, entidad_id: v.entidad_id, usuario: user.id_usuario }
          });
          if (famRes.data && famRes.data.nivel) {
            familiaridad = famRes.data.nivel;
          }
        } catch {}

        return {
          ...v,
          usuarios: usuarioInfo,
          entidad,
          fecha: v.registrado,
          emocion,
          familiaridad
        };
      }));

      setValoracionesEnriquecidas(enriquecidas);
    }
    enrichValoraciones();
  }, [user]);

  useEffect(() => {
    if (user?.id_usuario) {
      axios
        .get(`${API_URL}/usuarios/usuarios/${user.id_usuario}/estadisticas-musicales`)
        .then(res => setEstadisticas(res.data))
        .catch(() => setEstadisticas(null));
    }
  }, [user]);

  useEffect(() => {
    if (user?.id_usuario) {
      axios.get(`${API_URL}/listas-personalizadas/colaborativas-o-propias/${user.id_usuario}`)
        .then(res => setListas(
          res.data.filter(l =>
            l.privacidad === 'publica' ||
            (usuario && usuario.id_usuario === user.id_usuario) ||
            l.privacidad === 'colaborativa'
          )
        ));
    }
  }, [user, usuario]);

  useEffect(() => {
    if (usuario && followersList.length > 0) {
      setIsFollowing(followersList.some(seguidor => seguidor.id_usuario === usuario.id_usuario));
    }
  }, [usuario, followersList]);  

  useEffect(() => {
    if (user?.id_usuario) {
      axios.get(`${API_URL}/usuarios/usuarios/${user.id_usuario}`)
        .then(res => setMetodologia(res.data.metodologia_valoracion || null));
    }
  }, [user]);

  // Cargar géneros disponibles al inicio
  useEffect(() => {
    axios.get(`${API_URL}/generos`).then(res => setGenerosDisponibles(res.data || []));
  }, []);

  const PieChart = ({ porcentaje }) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(porcentaje, 0), 100); // Clamp 0-100
    const offset = circumference - (progress / 100) * circumference;

    return (
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle
          cx="20" cy="20" r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        <circle
          cx="20" cy="20" r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s' }}
        />
        <text x="20" y="24" textAnchor="middle" fontSize="10" fill="#333">
          {progress.toFixed(0)}%
        </text>
      </svg>
    );
  };
  
  const handleEdit = async () => {
    try {
      const formData = new FormData();

      // Agregar el nuevo nombre solo si se modificó
      if (newName) {
        formData.append('nombre', newName);
      }

      // Agregar la nueva foto solo si se seleccionó
      if (newProfilePic) {
        formData.append('foto_perfil', newProfilePic);
      }

      await axios.put(`${API_URL}/ranking/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setEditing(false);
      const response = await axios.get(`${API_URL}/ranking/${id}`);
      setUser(response.data);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!usuario) {
      alert('Debes iniciar sesión para seguir o dejar de seguir a un usuario.');
      navigate('/login');
      return;
    }
  
    try {
      const usuario_seguidor = usuario.id_usuario;
      const usuario_seguido = id;
  
      if (isFollowing) {
        await axios.post(`${API_URL}/ranking/unfollow`, { usuario_seguidor, usuario_seguido });
      } else {
        await axios.post(`${API_URL}/ranking/seguir`, { usuario_seguidor, usuario_seguido });
      }
  
      try {
        const response = await axios.get(`${API_URL}/ranking/${id}/seguidores`);
        setFollowersList(response.data);
        setFollowers(response.data.length);
        // Verificar si el usuario actual está en la lista de seguidores
        setIsFollowing(response.data.some(seguidor => seguidor.id_usuario === usuario?.id_usuario));
      } catch (error) {
        console.error('Error fetching followers:', error);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
    }
  };

  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/shareable?user=${user.id_usuario}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreview = () => {
    window.open(`/shareable?user=${user.id_usuario}`, '_blank');
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  // Medallas e Insignias
  const coleccionesCompletadas = colecciones.filter(c => (progresos[c.id_coleccion] || 0) >= 100);
  const catalogosCompletados = catalogos.filter(c => c.progreso >= 100);

  return (
  <div>
    <main className="p-4">
      <h2 className="text-4xl font-bold my-4">{user.username}</h2>
      <div className="section">
        <img
          src={user.foto_perfil || '/default-profile.png'}
          alt={user.username}
          className="profile-img"
        />
        <p className="text-lg font-semibold">Nombre: {user.nombre}</p>
        <p className="text-lg">Actividad: {activity}</p>
  
        {usuario && usuario.id_usuario === user.id_usuario && (
          <div>
          <button onClick={() => setEditing(true)} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
            Editar Perfil
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleCopyProfileLink}>
            Compartir perfil
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handlePreview}>
            Vista previa pública
          </button>
          </div>
        )}
        {copied && (
          <div className="mt-2 text-green-700 font-semibold">
            ¡Enlace copiado! Ahora ve y comparte ese link en tus redes sociales. Tu perfil se mostrará de la siguiente manera:
          </div>
        )}
        {usuario && usuario.id_usuario !== user.id_usuario && (
          <button onClick={handleFollowToggle} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
            {isFollowing ? 'Seguido' : 'Seguir'}
          </button>
        )}
      </div>
  
      {editing && (
        <div className="section mt-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nuevo nombre"
            className="border p-2 mb-2 w-full"
          />
          <input
            type="file"
            onChange={(e) => setNewProfilePic(e.target.files[0])}
            className="mb-2 w-full"
          />
          <button onClick={handleEdit} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="bg-gray-500 text-white px-4 py-2 rounded">
            Cancelar
          </button>
        </div>
      )}
          {usuario && usuario.id_usuario === user.id_usuario && (
            <div className="my-4">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={() => navigate('/personalizacion')}
              >
                Configurar preferencias de valoración
              </button>
            </div>
          )}
  {/* Mostrar metodologia_valoracion arriba de seguidores */}
      {metodologia && (
        <div className="section mb-6">
          <h3 className="text-2xl font-bold my-4">
            ¿Cómo valora {user.username}?
          </h3>
          <table className="table-auto border-collapse border border-gray-400 my-2">
            <tbody>
              <tr>
                <td className="border px-2 py-1 font-bold">Nivel de crítico</td>
                <td className="border px-2 py-1">
                  {metodologia.nivel_rigor === "estricto"
                    ? "Estricto"
                    : metodologia.nivel_rigor === "moderado"
                    ? "Moderado"
                    : "Fan"}
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-bold">
                  ¿Cómo prefiere valorar?
                </td>
                <td className="border px-2 py-1">
                  {metodologia.modo_valoracion === "manual"
                    ? "Manual"
                    : "Semi-automático"}
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-bold">
                  ¿Cómo se actualiza su ranking?
                </td>
                <td className="border px-2 py-1">
                  {metodologia.modo_ranking === "manual"
                    ? "Manual"
                    : "Semiautomático"}
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-bold">
                  Método de cálculo para álbumes
                </td>
                <td className="border px-2 py-1">
                  {metodologia.metodo_album || "-"}
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-bold">Redondeo</td>
                <td className="border px-2 py-1">
                  {metodologia.redondeo === "arriba"
                    ? "Hacia arriba"
                    : "Hacia abajo"}
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-bold">
                  Método de cálculo para artistas
                </td>
                <td className="border px-2 py-1">
                  {metodologia.metodo_artista || "-"}
                </td>
              </tr>

              {metodologia.metodo_artista === "ponderado" && (
                <tr>
                  <td className="border px-2 py-1 font-bold">Ponderado</td>
                  <td className="border px-2 py-1">
                    Álbumes: {metodologia.ponderado?.albumes}% | Canciones:{" "}
                    {metodologia.ponderado?.canciones}% | Videos:{" "}
                    {metodologia.ponderado?.videos}%
                  </td>
                </tr>
              )}

              {metodologia.metodo_artista === "promedio" && (
                <tr>
                  <td className="border px-2 py-1 font-bold">
                    Promedio avanzado
                  </td>
                  <td className="border px-2 py-1">
                    {metodologia.promedio_avanzado === "por_entidad"
                      ? "Por entidad"
                      : metodologia.promedio_avanzado === "conjunto"
                      ? "Todos juntos"
                      : "-"}
                  </td>
                </tr>
              )}

              {metodologia.metodo_artista === "mediana" && (
                <tr>
                  <td className="border px-2 py-1 font-bold">
                    Mediana avanzada
                  </td>
                  <td className="border px-2 py-1">
                    {metodologia.mediana_avanzado === "por_entidad"
                      ? "Por entidad"
                      : metodologia.mediana_avanzado === "promedio"
                      ? "Promedio de medianas"
                      : metodologia.mediana_avanzado === "conjunto"
                      ? "Todos juntos"
                      : "-"}
                  </td>
                </tr>
              )}

              {metodologia.metodo_artista === "moda" && (
                <tr>
                  <td className="border px-2 py-1 font-bold">Moda avanzada</td>
                  <td className="border px-2 py-1">
                    {metodologia.moda_avanzado === "por_entidad"
                      ? "Por entidad"
                      : metodologia.moda_avanzado === "promedio"
                      ? "Promedio de modas"
                      : metodologia.moda_avanzado === "conjunto"
                      ? "Todos juntos"
                      : "-"}
                  </td>
                </tr>
              )}

              <tr>
                <td className="border px-2 py-1 font-bold">
                  Géneros favoritos
                </td>
                <td className="border px-2 py-1">
                  {Array.isArray(metodologia.generos) && metodologia.generos.length > 0
                    ? generosDisponibles
                        .filter(g => metodologia.generos.includes(g.id_genero))
                        .map(g => g.nombre)
                        .join(", ")
                    : "-"}
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1 font-bold">Subgéneros</td>
                <td className="border px-2 py-1">
                  {Array.isArray(metodologia.subgeneros) &&
                  metodologia.subgeneros.length > 0
                    ? metodologia.subgeneros.join(", ")
                    : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div className="section mt-6">
        <h3 className="text-2xl font-bold my-4">Seguidores</h3>
        {followers === 0 ? <p>No tiene seguidores aún.</p> : (
          <UserListGrid title="Seguidores" items={followersList} isArtist={false} />
        )}
      </div>

      <div className="section mt-6">
        <h3 className="text-2xl font-bold my-4">Seguidos</h3>
        {usuariosSeguidos.length === 0 ? (
          <p>No sigue a ningún usuario aún.</p>
        ) : (
          <UserListGrid title="Usuarios seguidos" items={usuariosSeguidos} isArtist={false} />
        )}
      </div>

      <div className="section mt-6">
        <h3 className="text-2xl font-bold my-4">Artistas seguidos</h3>
        {artistasSeguidos.length === 0 ? <p>No sigue a ningún artista aún.</p> : (
          <UserListGrid title="Artistas seguidos" items={artistasSeguidos} isArtist={true} />
        )}
      </div>

      {usuario && usuario.id_usuario === user.id_usuario && (
        <>
          <div className="section mt-6">
            <h3 className="text-2xl font-bold my-4">
              Colecciones — Tu progreso
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {colecciones.map(coleccion => {
                const progreso = progresos[coleccion.id_coleccion] || 0;
                const completada = progreso >= 100;
                return (
                  <Link to={`/collection/${coleccion.id_coleccion}`}>
                    <div key={coleccion.id_coleccion} className={`profile-coleccion-card${completada ? ' completada' : ''}`}>
                      <img src={coleccion.icono || '/default_collection.png'} alt={coleccion.nombre} />
                      <div style={{ margin: '8px 0' }}>{coleccion.nombre}</div>
                      <div className="pie-chart"><PieChart porcentaje={progreso} /></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="section mt-6">
            <h3 className="text-2xl font-bold my-4">Catálogos de Artistas</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {catalogos.map(cat => (
                <Link to={`/artist/${cat.id_artista}`}>
                  <div key={cat.id_artista} className={`profile-catalogo-card${cat.progreso >= 100 ? ' completada' : ''}`}>
                    <img src={cat.foto_artista || '/default-artist.png'} alt={cat.nombre_artista} />
                    <div style={{ margin: '8px 0' }}>{cat.nombre_artista}</div>
                    <div className="pie-chart"><PieChart porcentaje={cat.progreso} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
      {usuario && usuario.id_usuario === user.id_usuario ? (
  <ModifyPersonalRanking usuario={usuario} />
) : (
  <div className="section mt-6">
    <h3 className="text-2xl font-bold my-4">
      Ranking Personal de {user.username}
    </h3>
    <ModifyPersonalRanking usuario={user} soloLectura={true} />
  </div>
)}

{estadisticas && (
  <div className="section mt-6">
    <h3 className="text-2xl font-bold my-4">Estadísticas y hábitos musicales</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6" style={{ maxWidth: 700, margin: "0 auto" }}>
      <div>
        <strong>Estrellas</strong>
        <Bar
          data={{
            labels: Object.keys(estadisticas.distribucionEstrellas),
            datasets: [{ label: "Valoraciones", data: Object.values(estadisticas.distribucionEstrellas), backgroundColor: "#22c55e" }],
          }}
          options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
          width={160}
          height={120}
        />
      </div>
      <div>
        <strong>Género</strong>
        <Pie
          data={{
            labels: estadisticas.porGenero.map((g) => g.nombre),
            datasets: [{ data: estadisticas.porGenero.map((g) => g.count), backgroundColor: ["#22c55e", "#3b82f6", "#f59e42", "#eab308"] }],
          }}
          options={{ plugins: { legend: { display: false } } }}
          width={120}
          height={120}
        />
      </div>
      <div>
        <strong>Año</strong>
        <Bar
          data={{
            labels: Object.keys(estadisticas.porAnio),
            datasets: [{ label: "Valoraciones", data: Object.values(estadisticas.porAnio), backgroundColor: "#3b82f6" }],
          }}
          options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
          width={120}
          height={120}
        />
      </div>
      <div>
        <strong>Familiaridad</strong>
        <Doughnut
          data={{
            labels: Object.keys(estadisticas.familiaridadCount),
            datasets: [{ data: Object.values(estadisticas.familiaridadCount), backgroundColor: ["#22c55e", "#f59e42", "#3b82f6"] }],
          }}
          options={{ plugins: { legend: { display: false } } }}
          width={120}
          height={120}
        />
      </div>
      <div>
        <strong>Emociones</strong>
        <Pie
          data={{
            labels: Object.keys(estadisticas.emocionCount),
            datasets: [{ data: Object.values(estadisticas.emocionCount), backgroundColor: ["#f59e42", "#3b82f6", "#eab308", "#ef4444"] }],
          }}
          options={{ plugins: { legend: { display: false } } }}
          width={120}
          height={120}
        />
      </div>
    </div>
    <div className="mt-2" style={{ fontSize: "0.95rem" }}>
      <strong>Valoraciones por tipo:</strong>
      <ul style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginTop: "8px" }}>
        <li>Artistas: {estadisticas.porTipo.artista}</li>
        <li>Álbumes: {estadisticas.porTipo.album}</li>
        <li>Canciones: {estadisticas.porTipo.cancion}</li>
        <li>Videos: {estadisticas.porTipo.video}</li>
      </ul>
    </div>
  </div>
)}

{/* === NUEVA SECCIÓN: Últimas valoraciones enriquecidas === */}
{valoracionesEnriquecidas.length > 0 && (
  <div className="section mt-6">
    <h3 className="text-2xl font-bold my-4">
      Últimas valoraciones de {user.username}
    </h3>
    <div className="space-y-4">
      {valoracionesEnriquecidas.map((v) => (
        <ValoracionComentarioEntidad
          key={`${v.tipo}-${v.entidad_id}`}
          valoracion={v}
        />
      ))}
    </div>
  </div>
)}

      <div className="section mt-6">
        <h3 className="text-2xl font-bold my-4">Medallas e Insignias del usuario</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {coleccionesCompletadas.map(coleccion => (
            <div key={coleccion.id_coleccion} className="profile-coleccion-card completada">
              <img src={coleccion.icono || '/default_collection.png'} alt={coleccion.nombre} />
              <div style={{ margin: '8px 0' }}>{coleccion.nombre}</div>
              <span className="medalla">🏅</span>
            </div>
          ))}
          {catalogosCompletados.map(cat => (
            <div key={cat.id_artista} className="profile-catalogo-card completada">
              <img src={cat.foto_artista || '/default-artist.png'} alt={cat.nombre_artista} />
              <div style={{ margin: '8px 0' }}>{cat.nombre_artista}</div>
              <span className="medalla">🏅</span>
            </div>
          ))}
          {insignias.map(ins => (
            <div key={ins.insignia_id} className="profile-insignia-card completada" style={{ width: 180, textAlign: 'center' }}>
              <img
                src={ins.insignias?.icono || '/default-insignia.png'}
                alt={ins.insignias?.nombre}
                style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto', display: 'block' }}
              />
              <div style={{ margin: '8px 0', fontWeight: 'bold' }}>{ins.insignias?.nombre}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 font-bold">
          Total medallas: {coleccionesCompletadas.length + catalogosCompletados.length + insignias.length}
        </div>
      </div>

      {/* Listas personalizadas */}
      <div className="section mt-6">
        <h3 className="text-2xl font-bold my-4">Listas personalizadas creadas por este usuario o que colabora</h3>
        {listas.length === 0 ? (
          <div>No hay listas públicas o colaborativas.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {listas.map(lista => (
              <Link to={`/list/${lista.id_lista}`} key={lista.id_lista} style={{ textDecoration: 'none', color: '#222' }}>
                <div className="profile-lista-card" style={{ width: 180, background: '#222', borderRadius: 8, padding: 12 }}>
                  <img src={lista.imagen || '/default_playlist.png'} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, margin: '0 auto', display: 'block' }} />
                  <div style={{ margin: '8px 0', color: '#fff', fontWeight: 'bold' }}>{lista.nombre_lista}</div>
                  <div style={{ color: '#aaa', fontSize: 12 }}>{lista.tipo_lista}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  </div>
);
};

export default Profile;