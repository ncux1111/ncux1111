import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function TemplatesGatewayPage() {
  const { currentUser, authReady } = useApp();

  if (!authReady) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'admin') {
    return <Navigate to="/admin/templates" replace />;
  }

  return <Navigate to="/employee/templates" replace />;
}
