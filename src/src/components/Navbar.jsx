import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard } from 'lucide-react'

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
                <div className="logo">
                    USD <span>Remote Jobs</span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary">
                        <LayoutDashboard size={16} style={{ marginRight: '6px' }} />
                        Dashboard
                    </button>

                    <button className="btn btn-secondary" onClick={handleLogout}>
                        <LogOut size={16} style={{ marginRight: '6px' }} />
                        Logout
                    </button>
                </div>
            </div>
        </header>
    )
}
