import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ user, roles, children }) => {
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Verificar si tipo_usuario está definido
  if (roles && (!user.tipo_usuario || !roles.includes(user.tipo_usuario))) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  user: PropTypes.shape({
    tipo_usuario: PropTypes.string,
  }),
  roles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;