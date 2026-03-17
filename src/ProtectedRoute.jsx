import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // 1. Check if the user has a VIP wristband (token)
  const token = localStorage.getItem('sprintSightToken');

  // 2. If there is no token, kick them back to the Login page instantly
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 3. If they have a token, let them see the component they asked for
  return children;
};

export default ProtectedRoute;