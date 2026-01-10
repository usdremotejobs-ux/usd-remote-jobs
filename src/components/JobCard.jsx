import { useNavigate, useLocation } from 'react-router-dom'
import { Briefcase, DollarSign, Clock } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { JOB_CACHE, CACHE_KEY_PREFIX, CACHE_TTL } from '../utils/jobCache'

export default function JobCard({ job, isNew = false }) {
    const navigate = useNavigate()
    const location = useLocation()

    const prefetchJob = async () => {
        const cached = JOB_CACHE.get(job.id)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return
        }

        try {
            const { data, error } = await supabase
                .from("jobs")
                .select("*")
                .eq("id", job.id)
                .single()

            if (!error && data) {
                const cacheEntry = {
                    data,
                    timestamp: Date.now()
                }

                JOB_CACHE.set(job.id, cacheEntry)

                try {
                    localStorage.setItem(
                        CACHE_KEY_PREFIX + job.id,
                        JSON.stringify(cacheEntry)
                    )
                } catch (err) {
                    console.log('LocalStorage full, skipping cache')
                }

                console.log(`Prefetched job ${job.id}`)
            }
        } catch (err) {
            console.log('Prefetch failed:', err)
        }
    }

    return (
        <div
            className="card job-card"
            onClick={() => {
                navigate(`/job/${job.id}`, { state: { from: location.search } })
            }}
            onMouseEnter={prefetchJob}
            style={{ cursor: 'pointer', position: 'relative' }}
        >
            {isNew && (
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        zIndex: 1,
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                >
                    NEW
                </div>
            )}

            {/* ✅ LOGO FIX HERE */}
            <div
                className="job-logo"
                style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: '#f9fafb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {job.company_logo_url ? (
                    <img
                        src={job.company_logo_url}
                        alt={job.company}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain', // ✅ FIXED
                            padding: '8px',
                        }}
                    />
                ) : (
                    <Briefcase size={24} />
                )}
            </div>

            <div className="job-info">
                <h3>{job.title}</h3>
                <p>{job.company}</p>

                <div className="job-meta">
                    <span className="badge badge-green">
                        <DollarSign size={12} style={{ verticalAlign: 'middle' }} /> {job.salary}
                    </span>
                    <span className="badge badge-blue">
                        <Briefcase size={12} style={{ verticalAlign: 'middle' }} /> {job.job_category}
                    </span>
                    <span className="badge badge-purple">
                        <Clock size={12} style={{ verticalAlign: 'middle' }} /> {job.experience}
                    </span>
                </div>
            </div>

            <div className="job-actions">
                <button className="btn btn-secondary">
                    View Details
                </button>
            </div>
        </div>
    )
}
