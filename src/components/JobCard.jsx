import { useNavigate } from 'react-router-dom'
import { Briefcase, DollarSign, Clock } from 'lucide-react'
import { supabase } from '../supabaseClient'

// ✅ LOCALSTORAGE CACHE for individual jobs
const CACHE_KEY_PREFIX = 'job_detail_'
const CACHE_TTL = 1000 * 60 * 10 // 10 minutes

// ✅ Memory cache for quick access during session
const JOB_CACHE = new Map()

// Load from localStorage on import
try {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      const cached = localStorage.getItem(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        const age = Date.now() - parsed.timestamp
        if (age < CACHE_TTL) {
          const jobId = key.replace(CACHE_KEY_PREFIX, '')
          JOB_CACHE.set(jobId, parsed)
        } else {
          localStorage.removeItem(key)
        }
      }
    }
  })
} catch (err) {
  console.error('Failed to load job cache:', err)
}

export default function JobCard({ job }) {
    const navigate = useNavigate()

    // ✅ PREFETCH on hover to make navigation instant
    const prefetchJob = async () => {
        // Check memory cache first
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
                
                // Save to memory
                JOB_CACHE.set(job.id, cacheEntry)
                
                // Save to localStorage
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
            onClick={() => navigate(`/job/${job.id}`)} 
            onMouseEnter={prefetchJob}
            style={{ cursor: 'pointer' }}
        >
            <div className="job-logo">
                {job.company_logo_url ? (
                    <img src={job.company_logo_url} alt={job.company} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                ) : (
                    <Briefcase size={24} />
                )}
            </div>

            <div className="job-info">
                <h3>{job.title}</h3>
                <p>{job.company}</p>

                <div className="job-meta">
                    <span className="badge badge-green"><DollarSign size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {job.salary}</span>
                    <span className="badge badge-blue"><Briefcase size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {job.job_category}</span>
                    <span className="badge badge-purple"><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {job.experience}</span>
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

// Export cache for use in JobDetail
export { JOB_CACHE, CACHE_KEY_PREFIX, CACHE_TTL }
