import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, CheckCircle } from 'lucide-react'
import Navbar from '../components/Navbar'

export default function Login() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const navigate = useNavigate()
    const { user } = useAuth()

    useEffect(() => {
        if (user) {
            navigate('/dashboard')
        }
    }, [user, navigate])

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin + '/dashboard',
                },
            })
            if (error) throw error
            setMessage('Check your email for the login link!')
        } catch (error) {
            alert(error.error_description || error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Navbar />
            <div className="login-container animate-fade-in">
                <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', fontWeight: '800' }}>
                    USD <span style={{ color: 'var(--primary)' }}>Remote</span> Jobs
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '32px' }}>
                    Login with your email to access premium USD remote jobs
                </p>

                {message ? (
                    <div className="card" style={{ padding: '32px', textAlign: 'center', maxWidth: '400px' }}>
                        <CheckCircle size={48} color="var(--primary)" style={{ marginBottom: '16px', margin: '0 auto' }} />
                        <h3 style={{ marginBottom: '8px' }}>Link Sent!</h3>
                        <p className="text-muted">{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="card" style={{ padding: '32px', width: '100%', maxWidth: '400px' }}>
                        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                            <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={20} style={{ position: 'absolute', left: '12px', top: '14px', color: '#9ca3af' }} />
                                <input
                                    id="email"
                                    className="input"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ paddingLeft: '40px' }}
                                    required
                                />
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Sending...' : 'Send Login Link'}
                        </button>
                    </form>
                )}
            </div>
        </>
    )
}
