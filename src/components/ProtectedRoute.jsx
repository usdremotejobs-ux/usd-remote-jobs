import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
    children,
    requireActiveSubscription = false,
}) {
    const { user, subscription } = useAuth();
    const location = useLocation();

    // 🔒 Not logged in
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 💳 Subscription required
    if (requireActiveSubscription) {
        if (!subscription || subscription.status !== "active") {
            return <Navigate to="/upgrade" replace />;
        }
    }

    return children;
}
