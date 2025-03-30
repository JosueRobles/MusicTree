import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const API_URL = "http://localhost:5000";

const Members = ({ usuario }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [rankingCombinado, setRankingCombinado] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await axios.get(`${API_URL}/ranking/ranking-combinado`);
        const rankingData = response.data.map(member => ({
          ...member,
          isFollowing: member.seguidores.includes(usuario?.id_usuario), // Verificar si el usuario actual está en la lista de seguidores
        }));
        setRankingCombinado(rankingData);
      } catch (error) {
        console.error('Error fetching ranking data:', error);
      }
    };
  
      const fetchUsuarios = async () => {
      try {
        const response = await axios.get(`${API_URL}/usuarios/usuarios`);
        setUsuarios(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsuarios();
    fetchRanking();
  }, [usuario]);

  const handleFollowToggle = async (usuario_seguido, isFollowing) => {
    if (!usuario) {
      alert('Debes iniciar sesión para seguir o dejar de seguir a un usuario.');
      navigate('/login');
      return;
    }
  
    try {
      const usuario_seguidor = usuario.id_usuario;
  
      if (isFollowing) {
        // Dejar de seguir
        await axios.post(`${API_URL}/ranking/unfollow`, { usuario_seguidor, usuario_seguido });
      } else {
        // Seguir
        await axios.post(`${API_URL}/ranking/seguir`, { usuario_seguidor, usuario_seguido });
      }
  
      // Actualizar el ranking
      const response = await axios.get(`${API_URL}/ranking/ranking-combinado`);
      setRankingCombinado(response.data);
    } catch (error) {
      console.error('Error toggling follow status:', error);
    }
  };

  return (
    <div>
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Miembros</h2>
        <div className="section">
          <h3 className="text-2xl font-bold my-4">Todos los Usuarios</h3>
          <ul>
          {usuarios.map(user => (
            <li key={user.id_usuario} className="flex items-center my-2">
              <img 
                src={user.foto_perfil ? `${API_URL}/uploads/${user.foto_perfil}` : '/default-profile.png'} 
                alt={user.username} 
                className="w-12 h-12 rounded-full mr-4" 
              /><div>
                <Link to={`/profile/${user.id_usuario}`} className="text-lg font-bold">{user.username}</Link>
                <p>{user.nombre}</p>
              </div>
              {usuario && user.id_usuario !== usuario.id_usuario && ( // No mostrar el botón si es el usuario autenticado
                <button 
                  className="ml-auto bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() => handleFollowToggle(user.id_usuario)}
                >
                  Seguir
                </button>
              )}
            </li>
          ))}
          </ul>
        </div>
        <div className="section">
          <h3 className="text-2xl font-bold my-4">Ranking Combinado</h3>
          <ul>
            {rankingCombinado.map(member => (
              <li key={member.id_usuario} className="flex items-center my-2">
                <img 
                  src={member.foto_perfil ? `${API_URL}/uploads/${member.foto_perfil}` : '/default-profile.png'} 
                  alt={member.username} 
                  className="w-12 h-12 rounded-full mr-4" 
                /><div>
                  <Link to={`/profile/${member.id_usuario}`} className="text-lg font-bold">{member.username}</Link>
                  <p>{member.nombre}</p>
                  <p>Seguidores: {member.seguidores}</p>
                  <p>Actividad: {member.actividad}</p>
                </div>
                <button 
                              className="ml-auto bg-blue-500 text-white px-4 py-2 rounded"
                              onClick={() => handleFollowToggle(member.id_usuario)}
                              disabled={usuario && member.id_usuario === usuario.id_usuario} // Deshabilitar si es el mismo usuario
                            >
                              {usuario && member.id_usuario === usuario.id_usuario ? 'Tú mismo' : 'Seguir'}
                            </button>
              </li>
            ))}
          </ul>
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