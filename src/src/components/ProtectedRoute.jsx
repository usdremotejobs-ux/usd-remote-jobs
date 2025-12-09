import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireActiveSubscription = false }) {
    const { user, subscription, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}>Loading...</div>
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (requireActiveSubscription) {
        // Check if subscription is active
        if (!subscription || subscription.status !== 'active') {
            return <Navigate to="/upgrade" replace />
        }
    }

    return children
}
