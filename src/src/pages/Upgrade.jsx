import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { Star, ShieldCheck } from 'lucide-react'

export default function Upgrade() {
    const { user, subscription } = useAuth()
    // Assuming subscription might be loaded but inactive/past_due/cancelled

    return (
        <>
            <Navbar />
            <div className="upgrade-container">
                <div style={{ background: '#eff6ff', display: 'inline-flex', padding: '16px', borderRadius: '50%', marginBottom: '24px' }}>
                    <Star size={48} color="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                </div>

                <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', fontWeight: '800' }}>Upgrade to Pro</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
                    Your subscription is currently <strong>{subscription?.status || 'inactive'}</strong>.
                    Unlock full access to premium high-paying remote jobs.
                </p>

                <div className="card" style={{ maxWidth: '400px', margin: '0 auto', padding: '32px', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Pro Access</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '24px', color: 'var(--text-main)' }}>
                        $49<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '400' }}>/month</span>
                    </div>

                    <ul style={{ marginBottom: '32px', display: 'grid', gap: '12px' }}>
                        {['Unlimited Job Access', 'Advanced Filters', 'Priority Alerts', 'No Ads'].map(feature => (
                            <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <ShieldCheck size={20} color="var(--primary)" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <a
                        href="#"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                        onClick={(e) => { e.preventDefault(); alert('Redirecting to stripe checkout...') }}
                    >
                        Upgrade Now
                    </a>
                </div>
            </div>
        </>
    )
}
