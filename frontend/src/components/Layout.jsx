import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import Encabezado from './Encabezado';
import PieDePagina from './PieDePagina';

const Layout = ({ usuario, onLogout }) => {
  return (
    <div>
      <Encabezado usuario={usuario} onLogout={onLogout} />
      <div className="content" style={{ paddingTop: '80px' }}>
        <Outlet />
      </div>
      <PieDePagina />
    </div>
  );
};

Layout.propTypes = {
  usuario: PropTypes.shape({
    id_usuario: PropTypes.number,
    nombre: PropTypes.string,
    username: PropTypes.string,
  }),
  onLogout: PropTypes.func.isRequired,
};

export default Layout;