import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth()
  const location = useLocation()

  // Wait for auth initialization
  if (authLoading) {
    return <div className="page-loader">Loading...</div>
  }

  // Check if user is logged in — that's all we need.
  // All users are lifetime subscribers, so no subscription check required.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
