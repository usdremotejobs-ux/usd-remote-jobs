import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children, requireActiveSubscription }) {
  const { user, subscription, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    // This will now show the bouncing briefcase until subscription is ready
    return <div className="page-loader"></div> 
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireActiveSubscription) {
    // Ensure we have a definitive "no" before redirecting
    // If subscription is null (and we aren't loading), it means the user has NO plan.
    if (!subscription || subscription.status !== "active") {
      return <Navigate to="/upgrade" replace />
    }
  }

  return children
}
