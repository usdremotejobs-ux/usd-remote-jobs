import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import Upgrade from "./pages/Upgrade";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <AuthProvider>
            <Router>
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
            </Router>
        </AuthProvider>
    );
}

export default App;
