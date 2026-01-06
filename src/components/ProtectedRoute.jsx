import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children, requireActiveSubscription }) {
  const {
    user,
    subscription,
    authLoading,
    subscriptionResolved,
  } = useAuth()

  const location = useLocation()

  // 🚦 Block routing until auth + subscription are KNOWN
  if (authLoading || !subscriptionResolved) {
    return <div className="page-loader">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireActiveSubscription) {
    if (!subscription || subscription.status !== "active") {
      return <Navigate to="/upgrade" replace />
    }
  }

  return children
}
