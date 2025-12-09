import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import { Briefcase, MapPin, DollarSign, Clock, ArrowLeft, ExternalLink } from 'lucide-react'

export default function JobDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [job, setJob] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchJob()
    }, [id])

    const fetchJob = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching job:', error)
            // Redirect to dashboard if not found or error?
            // navigate('/dashboard') 
        } else {
            setJob(data)
        }
        setLoading(false)
    }

    if (loading) return (
        <>
            <Navbar />
            <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>Loading Job Details...</div>
        </>
    )

    if (!job) return (
        <>
            <Navbar />
            <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>Job not found</div>
        </>
    )

    return (
        <>
            <Navbar />
            <div className="container" style={{ padding: '40px 20px', maxWidth: '900px' }}>
                <button onClick={() => navigate('/dashboard')} className="btn" style={{ marginBottom: '24px', paddingLeft: 0, color: 'var(--text-muted)' }}>
                    <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back to Jobs
                </button>

                {/* Header */}
                <div className="card" style={{ padding: '32px', marginBottom: '32px', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', background: '#f3f4f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {job.company_logo_url ? <img src={job.company_logo_url} alt={job.company} style={{ borderRadius: '16px', width: '100%', height: '100%' }} /> : <Briefcase size={32} color="#9ca3af" />}
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{job.title}</h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '24px' }}>{job.company}</p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span className="badge badge-green"><DollarSign size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {job.salary}</span>
                        <span className="badge badge-blue"><Briefcase size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {job.job_category}</span>
                        <span className="badge badge-purple"><Clock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {job.experience}</span>
                    </div>
                </div>

                {/* Content */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '40px', alignItems: 'start' }} className="job-content-grid">
                    <div className="card" style={{ padding: '32px' }}>
                        <Section title="Job Details" content={job.job_details} />
                        <Section title="Requirements" content={job.requirements} />
                        <Section title="Benefits" content={job.benefits} />
                        <Section title="About Company" content={job.about_company} />
                    </div>

                    {/* Sticky Sidebar / Apply CTA */}
                    <div className="sticky-sidebar">
                        <div className="card" style={{ padding: '24px', position: 'sticky', top: '100px' }}>
                            <h3 style={{ marginBottom: '16px' }}>Interested?</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                                Apply for this position directly on the company website.
                            </p>

                            {job.apply_link ? (
                                <a
                                    href={job.apply_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    Apply Now <ExternalLink size={16} style={{ marginLeft: '8px' }} />
                                </a>
                            ) : (
                                <button disabled className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', opacity: 0.6, cursor: 'not-allowed' }}>
                                    Applications Closed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Apply */}
            <div className="mobile-apply-bar">
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '600' }}>{job.title}</div>
                    {job.apply_link ? (
                        <a href={job.apply_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Apply Now</a>
                    ) : (
                        <button disabled className="btn btn-secondary" style={{ opacity: 0.6 }}>Closed</button>
                    )}
                </div>
            </div>

            <style>{`
        @media (max-width: 900px) {
          .job-content-grid {
            grid-template-columns: 1fr !important;
          }
          .sticky-sidebar {
            display: none; 
          }
        }
        .mobile-apply-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          padding: 16px 0;
          border-top: 1px solid var(--border);
          box-shadow: 0 -4px 10px rgba(0,0,0,0.05);
          display: none;
          z-index: 100;
        }
        @media (max-width: 768px) {
           .mobile-apply-bar { display: block; }
           .container { padding-bottom: 80px; } 
        }
      `}</style>
        </>
    )
}

function Section({ title, content }) {
    if (!content) return null
    return (
        <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', display: 'inline-block' }}>{title}</h3>
            <div style={{ lineHeight: '1.7', color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
                {content}
            </div>
        </div>
    )
}
