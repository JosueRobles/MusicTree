import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useContext } from 'react';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = "http://localhost:5000";

const Profile = () => {
  const { usuario } = useContext(UsuarioContext); // Obtener el usuario desde el contexto
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [followers, setFollowers] = useState(0);
  const [activity, setActivity] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProfilePic, setNewProfilePic] = useState('');
  const [following, setFollowing] = useState([]);

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
  }, [id]);

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

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">{user.username}</h2>
        <div className="section">
          <h3 className="text-2xl font-bold my-4">Perfil</h3>
          {editing ? (
            <div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nuevo nombre"
                className="border p-2 mb-4"
              />
              <input
                type="file"
                onChange={(e) => setNewProfilePic(e.target.files[0])}
                className="mb-4"
              />
              <button onClick={handleEdit} className="bg-blue-500 text-white px-4 py-2 rounded">
                Guardar
              </button>
              <button onClick={() => setEditing(false)} className="ml-2 bg-gray-500 text-white px-4 py-2 rounded">
                Cancelar
              </button>
            </div>
          ) : (
            <div>
              <img 
                src={user.foto_perfil ? `${API_URL}/uploads/${user.foto_perfil}` : '/default-profile.png'} 
                alt={user.username} 
                className="w-24 h-24 rounded-full" 
              />
              <p>Nombre: {user.nombre}</p>
              <p>Seguidores: {followers}</p>
              <p>Actividad: {activity}</p>
              {usuario && usuario.id_usuario === user.id_usuario && (
                <button onClick={() => setEditing(true)} className="bg-blue-500 text-white px-4 py-2 rounded">
                  Editar Perfil
                </button>
              )}
            </div>
          )}
        </div>
        <div className="section">
          <h3 className="text-2xl font-bold my-4">Siguiendo</h3>
          <ul>
            {following.map((followed) => (
              <li key={followed.id_usuario}>
                <p>{followed.nombre} ({followed.username})</p>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Profile;