import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard } from 'lucide-react'
import logo from '../assets/logo.png'

export default function Navbar() {
    const { logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <header className="header">
            <div className="container header-content">
                
                {/* Logo — icon only */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="logo-btn"
                    aria-label="Go to dashboard"
                >
                    <img
                        src={logo}
                        alt="USD Remote Jobs"
                        className="logo-img"
                    />
                </button>

                <div className="nav-actions">
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate('/dashboard')}
                    >
                        <LayoutDashboard size={16} />
                        <span className="btn-text">Dashboard</span>
                    </button>

                    <button 
                        className="btn btn-secondary" 
                        onClick={handleLogout}
                    >
                        <LogOut size={16} />
                        <span className="btn-text">Logout</span>
                    </button>
                </div>
            </div>
        </header>
    )
}
