import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ user, roles, children }) => {
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.tipo_usuario)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;