import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute component
 * Protects routes that require authentication
 * Redirects to login page if user is not authenticated
 */
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  // Show loading indicator while checking auth status
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
}

export default ProtectedRoute;
