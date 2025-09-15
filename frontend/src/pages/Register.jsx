import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = import.meta.env.VITE_API_URL;

const Register = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUsuario } = useContext(UsuarioContext);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${API_URL}/auth/register`, {
        nombre,
        email,
        username,
        password,
      });
      // Espera hasta que el login funcione (reintenta si falla)
      let loginRes = null;
      for (let i = 0; i < 5; i++) {
        try {
          loginRes = await axios.post(`${API_URL}/auth/login`, {
            emailOrUsername: email,
            password,
          });
          break;
        } catch {
          await new Promise(res => setTimeout(res, 700));
        }
      }
      if (!loginRes) throw new Error("No se pudo iniciar sesión tras el registro");
      localStorage.setItem('token', loginRes.data.token);
      setUsuario(loginRes.data.user);
      setTimeout(() => {
        window.location.href = '/personalizacion';
      }, 2000);
    } catch (err) {
      setError('Error al registrar usuario');
    }
  };

  return (
    <div className="max-w-sm w-full mx-auto p-4 border rounded shadow-md mt-10" style={{ minWidth: 0 }}>
      <h2 className="text-xl font-semibold mb-4 text-center">Registrarse</h2>

      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Nombre:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Correo:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Nombre de Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button type="submit" className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">
          Registrarse
        </button>
      </form>
    </div>
  );
};

export default Register;