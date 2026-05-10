import React from 'react';
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useContext(AuthContext);
  
  console.log("🛡️ PrivateRoute Check:", {
    user,
    userRole: user?.role,
    allowedRoles,
    isAllowed: user && (allowedRoles.length === 0 || allowedRoles.includes(user.role))
  });
  
  if (!user) {
    console.log("❌ No user found, redirecting to login");
    // Redirect to login if user is not authenticated
    return <Navigate to="/login" replace />;
  }

  // If no specific roles are required, allow access
  if (allowedRoles.length === 0) {
    console.log("✅ No role restriction, allowing access");
    return children;
  }

  // Check if user's role is allowed
  if (!allowedRoles.includes(user.role)) {
    console.log(`❌ User role '${user.role}' not in allowed roles:`, allowedRoles);
    // Redirect to appropriate page based on role
    const redirectMap = {
      'Driver': '/mes-reservations',
      'Vehicle_Owner': '/mes-reservations',
      'Owner': '/my-parkings',
      'Space_Owner': '/my-parkings',
      'Admin': '/admin',
      'Employe': '/ScanQr',
      'Employee': '/ScanQr'
    };
    const redirectTo = redirectMap[user.role] || '/';
    console.log(`🔄 Redirecting to: ${redirectTo}`);
    return <Navigate to={redirectTo} replace />;
  }

  console.log("✅ Access granted!");
  return children;
};

export default PrivateRoute;
