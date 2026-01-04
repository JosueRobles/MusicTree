import { Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import Encabezado from './Encabezado';
import PieDePagina from './PieDePagina';

const Layout = ({ usuario, onLogout }) => {
  const location = useLocation();
  const hideLayout = location.pathname.startsWith('/shareable');
  return (
    <div>
      {!hideLayout && <Encabezado usuario={usuario} onLogout={onLogout} />}
      <div className="content" style={{ paddingTop: hideLayout ? 0 : '150px' }}>
        <Outlet />
      </div>
      {!hideLayout && <PieDePagina />}
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