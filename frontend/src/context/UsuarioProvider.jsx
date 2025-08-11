import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { UsuarioContext } from './UsuarioContext';

const API_URL = "http://localhost:5000";

const UsuarioProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);

  useEffect(() => {
    const fetchUsuarioActual = async () => {
      try {
        const response = await axios.get(`${API_URL}/usuarios/current-user`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUsuario(response.data);
      } catch (error) {
        setUsuario(null);
      } finally {
        setCargandoUsuario(false);
      }
    };

    fetchUsuarioActual();
  }, []);

  return (
    <UsuarioContext.Provider value={{ usuario, setUsuario, cargandoUsuario }}>
      {children}
    </UsuarioContext.Provider>
  );
};

UsuarioProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UsuarioProvider;