import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children, requireActiveSubscription }) {
  const { user, subscription, authLoading } = useAuth()
  const location = useLocation()

  // ✅ Show loading only during auth initialization
  if (authLoading) {
    return <div className="page-loader">Loading...</div>
  }

  // ✅ Check if user is logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ✅ If subscription is required, check it immediately
  if (requireActiveSubscription) {
    if (!subscription || subscription.status !== "active") {
      console.log("Redirecting to upgrade - subscription:", subscription)
      return <Navigate to="/upgrade" replace />
    }
  }

  return children
}
