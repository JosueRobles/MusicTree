import { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const API_URL = "http://localhost:5000";

const Login = ({ onLoginExitoso }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { emailOrUsername, password });
      const { token, user } = response.data; // Obtener la información del usuario además del token
      if (token) {
        localStorage.setItem('token', token);
        onLoginExitoso(user); // Pasar la información del usuario
        console.log('Token guardado:', token); // Confirmar que el token se guarda
      } else {
        setError('No se recibió un token.');
      }
    } catch (err) {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded shadow-md mt-10">
      <h2 className="text-xl font-semibold mb-4 text-center">Iniciar Sesión</h2>

      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Correo o Usuario:</label>
          <input
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
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
          Iniciar Sesión
        </button>
      </form>
    </div>
  );
};

Login.propTypes = {
  onLoginExitoso: PropTypes.func.isRequired,
};

export default Login;