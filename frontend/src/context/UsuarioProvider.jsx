import { useState } from 'react';
import PropTypes from 'prop-types';
import { UsuarioContext } from './UsuarioContext';

const UsuarioProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);

  return (
    <UsuarioContext.Provider value={{ usuario, setUsuario }}>
      {children}
    </UsuarioContext.Provider>
  );
};

UsuarioProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UsuarioProvider;