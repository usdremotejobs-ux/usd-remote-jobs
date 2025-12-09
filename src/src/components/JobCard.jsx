import { useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, DollarSign, Clock } from 'lucide-react'

export default function JobCard({ job }) {
    const navigate = useNavigate()

    return (
        <div className="card job-card" onClick={() => navigate(`/job/${job.id}`)} style={{ cursor: 'pointer' }}>
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
                {/* On mobile this wraps, on desktop it's to the right */}
                <button className="btn btn-secondary">
                    View Details
                </button>
            </div>
        </div>
    )
}
