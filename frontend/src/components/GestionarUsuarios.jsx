import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

const GestionarUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const obtenerUsuarios = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(res.data);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
    }
  };

  const eliminarUsuario = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/usuarios/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Usuario eliminado exitosamente.");
      setUsuarios(usuarios.filter((usuario) => usuario.id_usuario !== id));
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert("No se pudo eliminar el usuario.");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
      <ul className="mt-4 space-y-2">
        {usuarios.map((usuario) => (
          <li key={usuario.id_usuario} className="border p-2 rounded shadow-md flex justify-between items-center">
            <div>
              <p className="font-semibold">{usuario.nombre}</p>
              <p className="text-sm text-gray-500">Email: {usuario.email}</p>
              <p className="text-sm text-gray-500">Rol: {usuario.tipo_usuario}</p>
            </div>
            <button
              onClick={() => eliminarUsuario(usuario.id_usuario)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GestionarUsuarios;