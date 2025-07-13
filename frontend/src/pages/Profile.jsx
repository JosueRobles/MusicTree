import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { UsuarioContext } from '../context/UsuarioContext';
import { Link } from 'react-router-dom';
import ModifyPersonalRanking from '../components/ModifyPersonalRanking';
import UserListGrid from '../components/UserListGrid';

const API_URL = "http://localhost:5000";

const Profile = () => {
  const { usuario } = useContext(UsuarioContext); // Obtener el usuario desde el contexto
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [followers, setFollowers] = useState(0);
  const [activity, setActivity] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProfilePic, setNewProfilePic] = useState('');
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [colecciones, setColecciones] = useState([]);
  const [progresos, setProgresos] = useState({});
  const [catalogos, setCatalogos] = useState([]);
  const [usuariosSeguidos, setUsuariosSeguidos] = useState([]);
  const [artistasSeguidos, setArtistasSeguidos] = useState([]);
  const [copied, setCopied] = useState(false);

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
  
  useEffect(() => {
    if (usuario && followersList.length > 0) {
      setIsFollowing(followersList.some(seguidor => seguidor.id_usuario === usuario.id_usuario));
    }
  }, [usuario, followersList]);  

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

  return (
  <div>
    <main className="p-4">
      <h2 className="text-4xl font-bold my-4">{user.username}</h2>
      <div className="section">
        <img 
          src={user.foto_perfil ? `${API_URL}/uploads/${user.foto_perfil}` : '/default-profile.png'} 
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

      {/* SOLO la sección de colecciones debe ir dentro de este bloque */}
      {user && (
        <div className="section mt-6">
          <h3 className="text-2xl font-bold my-4">
            Colecciones {usuario && usuario.id_usuario === user.id_usuario ? '— Tu progreso' : 'completadas'}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {colecciones.map(coleccion => {
              const progreso = progresos[coleccion.id_coleccion] || 0;
              const completada = progreso >= 100;
              if (usuario && usuario.id_usuario !== user.id_usuario && !completada) return null;
              return (
                <div key={coleccion.id_coleccion} className={`profile-coleccion-card${completada ? ' completada' : ''}`}>
                  <img src={coleccion.icono} alt={coleccion.nombre} />
                  <div style={{ margin: '8px 0' }}>{coleccion.nombre}</div>
                  {usuario && usuario.id_usuario === user.id_usuario ? (
                    <div className="pie-chart"><PieChart porcentaje={progreso} /></div>
                  ) : completada ? (
                    <span className="medalla">🏅</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="section mt-6">
        <h3 className="text-2xl font-bold my-4">Catálogos de Artistas</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {catalogos.map(cat => {
            const completado = cat.progreso >= 100;
            if (usuario && usuario.id_usuario !== user.id_usuario && !completado) return null;
            return (
              <div key={cat.id_artista} className={`profile-catalogo-card${completado ? ' completada' : ''}`}>
                <img src={cat.foto_artista || '/default-artist.png'} alt={cat.nombre_artista} />
                <div style={{ margin: '8px 0' }}>{cat.nombre_artista}</div>
                <div className="pie-chart"><PieChart porcentaje={cat.progreso} /></div>
                {completado && <span className="medalla">🏅</span>}
              </div>
            );
          })}
        </div>
      </div>
      {usuario && usuario.id_usuario === user.id_usuario ? (
        <ModifyPersonalRanking usuario={usuario} />
      ) : (
        <div className="section mt-6">
          <h3 className="text-2xl font-bold my-4">Ranking Personal de {user.username}</h3>
          <ModifyPersonalRanking usuario={user} soloLectura={true} />
        </div>
      )}
    </main>
  </div>
);
};

export default Profile;