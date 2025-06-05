import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { UsuarioContext } from '../context/UsuarioContext';
import { Link } from 'react-router-dom';

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
        const response = await axios.get(`${API_URL}/ranking/${id}/siguiendo`);
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
          <p className="text-lg">Seguidores: {followers} — Siguiendo: {following.length}</p>
  
          {usuario && usuario.id_usuario === user.id_usuario && (
            <button onClick={() => setEditing(true)} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
              Editar Perfil
            </button>
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
            <ul className="grid grid-cols-2 gap-4">
              {followersList.map((follower) => (
                <li key={follower.id_usuario} className="flex items-center space-x-2">
                  <img 
                    src={follower.foto_perfil ? `${API_URL}/uploads/${follower.foto_perfil}` : '/default-profile.png'} 
                    alt={follower.username} 
                    className="profile-icon"
                  />
                  <Link to={`/profile/${follower.id_usuario}`} className="text-blue-500 hover:underline">
                  {follower.nombre} ({follower.username})
                </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
  
        <div className="section mt-6">
          <h3 className="text-2xl font-bold my-4">Siguiendo</h3>
          {following.length === 0 ? <p>No sigue a nadie aún.</p> : (
            <ul className="grid grid-cols-2 gap-4">
              {following.map((followed) => (
                <li key={followed.id_usuario} className="flex items-center space-x-2">
                  <img 
                    src={followed.foto_perfil ? `${API_URL}/uploads/${followed.foto_perfil}` : '/default-profile.png'} 
                    alt={followed.username} 
                    className="profile-icon"
                  />
                  <a href={`/profile/${followed.id_usuario}`} className="text-blue-500 hover:underline">
                    {followed.nombre} ({followed.username})
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );  
};

export default Profile;