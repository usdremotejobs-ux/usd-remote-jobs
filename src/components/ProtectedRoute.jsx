import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"

export default function ProtectedRoute({ children, requireActiveSubscription }) {
  const { user, subscription, authLoading } = useAuth()
  const location = useLocation()
  
  // ✅ Track if this is initial page load
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [gracePeriodComplete, setGracePeriodComplete] = useState(false)

  useEffect(() => {
    if (!authLoading && isInitialLoad) {
      // On initial page load, give extra time for subscription to load
      const timer = setTimeout(() => {
        setGracePeriodComplete(true)
        setIsInitialLoad(false)
      }, 2000) // 2 second grace period for page refresh
      
      return () => clearTimeout(timer)
    } else if (!authLoading) {
      // For subsequent navigation, grace period is instant
      setGracePeriodComplete(true)
    }
  }, [authLoading, isInitialLoad])

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
    // During grace period, show loading instead of redirecting
    if (!gracePeriodComplete) {
      return <div className="page-loader">Verifying subscription...</div>
    }

    // After grace period, check subscription
    if (!subscription || subscription.status !== "active") {
      console.log("Redirecting to upgrade - subscription:", subscription)
      return <Navigate to="/upgrade" replace />
    }
  }

  return children
}
