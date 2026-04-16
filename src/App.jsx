import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import GlobalLoader from "./components/GlobalLoader"; 
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
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
                    !user ? <Login /> : <Navigate to="/dashboard" replace />
                } 
            />

            {/* Protected — login required, no subscription check */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/job/:id"
                element={
                    <ProtectedRoute>
                        <JobDetail />
                    </ProtectedRoute>
                }
            />

            {/* Default */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Catch-all: redirect stale /upgrade bookmarks to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
