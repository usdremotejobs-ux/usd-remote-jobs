import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
    children,
    requireActiveSubscription = false,
}) {
    const { user, subscription, loading } = useAuth();
    const location = useLocation();

    // ⛔ CRITICAL: NEVER redirect while loading
    if (loading) {
        return (
            <div
                className="container"
                style={{ paddingTop: "60px", textAlign: "center" }}
            >
                Loading...
            </div>
        );
    }

    // 🔒 Not logged in → login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 💳 Subscription required
    if (requireActiveSubscription) {
        /**
         * subscription === null → not active
         * subscription.status !== "active" → not active
         * lifetime users are already handled in AuthContext
         */
        if (!subscription || subscription.status !== "active") {
            return <Navigate to="/upgrade" replace />;
        }
    }

    // ✅ All good → render page
    return children;
}
