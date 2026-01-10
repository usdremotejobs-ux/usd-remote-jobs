import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children, requireActiveSubscription }) {
  const {
    user,
    subscription,
    authLoading,
    subscriptionLoading,
  } = useAuth()

  const location = useLocation()

  // ⏳ Still initializing auth
  if (authLoading) {
    return <div className="page-loader">Loading...</div>
  }

  // ❌ Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ⏳ Logged in, but subscription is still loading
  if (requireActiveSubscription && subscriptionLoading) {
    return <div className="page-loader">Checking subscription...</div>
  }

  // ❌ Subscription required but inactive / missing
  if (requireActiveSubscription) {
    if (!subscription || subscription.status !== "active") {
      return <Navigate to="/upgrade" replace />
    }
  }

  // ✅ All checks passed
  return children
}
