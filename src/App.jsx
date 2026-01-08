import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import GlobalLoader from "./components/GlobalLoader"; 
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import Upgrade from "./pages/Upgrade";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
    // ✅ Get 'user' from auth context to check if already logged in
    const { authLoading, user } = useAuth()

    if (authLoading) {
        return <GlobalLoader />;
    }

    return (
        <Routes>
            {/* Public */}
            <Route 
                path="/login" 
                element={
                    // ✅ FIX: If user is already logged in, go to Dashboard
                    !user ? <Login /> : <Navigate to="/dashboard" replace />
                } 
            />
            <Route path="/upgrade" element={<Upgrade />} />

            {/* Protected */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute requireActiveSubscription>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/job/:id"
                element={
                    <ProtectedRoute requireActiveSubscription>
                        <JobDetail />
                    </ProtectedRoute>
                }
            />

            {/* Default */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;
