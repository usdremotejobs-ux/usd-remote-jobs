import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"

export default function ProtectedRoute({ children, requireActiveSubscription }) {
  const { user, subscription, authLoading } = useAuth()
  const location = useLocation()
  
  // ✅ Add grace period for subscription checks to prevent premature redirects
  const [subscriptionChecked, setSubscriptionChecked] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      // Give a moment for subscription to load after auth completes
      const timer = setTimeout(() => {
        setSubscriptionChecked(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authLoading])

  // ✅ Show loading during auth initialization
  if (authLoading) {
    return <div className="page-loader">Loading...</div>
  }

  // ✅ Check if user is logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ✅ If subscription is required, check it
  if (requireActiveSubscription) {
    // Give subscription check a grace period
    if (!subscriptionChecked) {
      return <div className="page-loader">Verifying subscription...</div>
    }

    if (!subscription || subscription.status !== "active") {
      console.log("Redirecting to upgrade - subscription status:", subscription?.status)
      return <Navigate to="/upgrade" replace />
    }
  }

  return children
}
