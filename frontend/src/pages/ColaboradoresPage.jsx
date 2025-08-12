import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = import.meta.env.VITE_API_URL;

const ColaboradoresPage = () => {
  const { id } = useParams(); // id de la lista
  const { usuario } = useContext(UsuarioContext);
  const [colaboradores, setColaboradores] = useState([]);
  const [nuevoColaborador, setNuevoColaborador] = useState('');
  const [nuevoRol, setNuevoRol] = useState('agregar');
  const [error, setError] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [listaInfo, setListaInfo] = useState(null);

  // Saber si el usuario puede gestionar colaboradores (dueño o admin)
  const puedeGestionar = () => {
    if (!usuario || !listaInfo) return false;
    return (
      String(listaInfo.usuario_id) === String(usuario.id_usuario) ||
      listaInfo.rol_colaborador === 'admin'
    );
  };

  // Buscar usuarios para autocompletar
  const handleBuscar = async (e) => {
    const value = e.target.value;
    setNuevoColaborador(value);
    if (value.length > 1) {
      const res = await axios.get(`${API_URL}/listas-personalizadas/buscar-usuarios?q=${value}`);
      setSugerencias(res.data);
    } else {
      setSugerencias([]);
    }
  };

  // Obtener colaboradores y datos de la lista
  const fetchColaboradores = async () => {
    try {
      const res = await axios.get(`${API_URL}/listas-personalizadas/colaboradores/${id}`);
      setColaboradores(res.data);
    } catch (err) {
      setError('Error al cargar colaboradores');
    }
  };

  const fetchListaInfo = async () => {
    try {
      // Trae info de la lista y el rol del usuario logueado
      const res = await axios.get(`${API_URL}/listas-personalizadas/detalle/${id}?userId=${usuario?.id_usuario}`);
      setListaInfo(res.data);
    } catch (err) {
      setError('Error al cargar información de la lista');
    }
  };

  useEffect(() => {
    fetchColaboradores();
    if (usuario) fetchListaInfo();
    // eslint-disable-next-line
  }, [id, usuario]);

  // Agregar colaborador
  const handleAgregar = async () => {
    try {
      await axios.post(`${API_URL}/listas-personalizadas/colaboradores/${id}`, {
        username: nuevoColaborador,
        rol: nuevoRol,
        userId: usuario.id_usuario
      });
      setNuevoColaborador('');
      fetchColaboradores();
    } catch (err) {
      setError('No se pudo agregar colaborador');
    }
  };

  // Eliminar colaborador
  const handleEliminar = async (usuarioId) => {
    try {
      await axios.delete(`${API_URL}/listas-personalizadas/colaboradores/${id}/${usuarioId}`, {
        params: { userId: usuario.id_usuario }
      });
      fetchColaboradores();
    } catch (err) {
      setError('No se pudo eliminar colaborador');
    }
  };

  // Cambiar rol de colaborador
  const handleRol = async (usuarioId, rol) => {
    try {
      await axios.put(`${API_URL}/listas-personalizadas/colaboradores/${id}/${usuarioId}`, {
        rol,
        userId: usuario.id_usuario
      });
      fetchColaboradores();
    } catch (err) {
      setError('No se pudo cambiar el rol');
    }
  };

  return (
    <div>
      <h2>Colaboradores de la lista</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {colaboradores.map(colab => (
          <li key={colab.usuario_id}>
            {colab.username} ({colab.rol})
            {puedeGestionar() && (
              <>
                <select value={colab.rol} onChange={e => handleRol(colab.usuario_id, e.target.value)}>
                  <option value="agregar">Agregar</option>
                  <option value="admin">Admin</option>
                  <option value="eliminar">Eliminar</option>
                </select>
                <button onClick={() => handleEliminar(colab.usuario_id)}>Eliminar</button>
              </>
            )}
          </li>
        ))}
      </ul>
      {puedeGestionar() && (
        <>
          <h3>Agregar colaborador</h3>
          <input
            type="text"
            placeholder="Username"
            value={nuevoColaborador}
            onChange={handleBuscar}
          />
          {sugerencias.length > 0 && (
            <ul>
              {sugerencias.map(u => (
                <li key={u.id_usuario} onClick={() => {
                  setNuevoColaborador(u.username);
                  setSugerencias([]);
                }}>{u.username}</li>
              ))}
            </ul>
          )}
          <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)}>
            <option value="agregar">Agregar</option>
            <option value="admin">Admin</option>
            <option value="eliminar">Eliminar</option>
          </select>
          <button onClick={handleAgregar}>Agregar</button>
        </>
      )}
    </div>
  );
};

export default ColaboradoresPage;