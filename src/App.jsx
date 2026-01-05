import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import Upgrade from "./pages/Upgrade";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
    const { authLoading } = useAuth()

    // ✅ GLOBAL LOADING SCREEN
    if (authLoading) {
        return (
            <div
                style={{
                    paddingTop: "60px",
                    textAlign: "center",
                }}
            >
                Loading...
            </div>
        );
    }

    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
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
