import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import JobCard from '../components/JobCard'
import { Search, X } from 'lucide-react'

export default function Dashboard() {
    const [jobs, setJobs] = useState([])
    const [filteredJobs, setFilteredJobs] = useState([])
    const [loading, setLoading] = useState(true)

    const [category, setCategory] = useState('')
    const [salary, setSalary] = useState('')
    const [experience, setExperience] = useState('')
    const [search, setSearch] = useState('')

    // ✅ PAGINATION STATES
    const [currentPage, setCurrentPage] = useState(1)
    const jobsPerPage = 10

    // ✅ FETCH JOBS
    useEffect(() => {
        fetchJobs()
    }, [])

    const fetchJobs = async () => {
        setLoading(true)

        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error fetching jobs:', error)
        } else {
            setJobs(data || [])
            setFilteredJobs(data || [])
        }

        setLoading(false)
    }

    // ✅ FILTER LOGIC
    useEffect(() => {
        let result = [...jobs]

        if (category) {
            result = result.filter(job => job.job_category === category)
        }

        if (salary) {
            result = result.filter(
                job => job["salary for filter"] === salary
            )
        }

        if (experience) {
            result = result.filter(
                job => job["experience for filter"] === experience
            )
        }

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(job =>
                job.title?.toLowerCase().includes(q) ||
                job.company?.toLowerCase().includes(q)
            )
        }

        setFilteredJobs(result)
        setCurrentPage(1) // ✅ Reset to page 1 on filter change
    }, [jobs, category, salary, experience, search])

    // ✅ CLEAR
    const clearFilters = () => {
        setCategory('')
        setSalary('')
        setExperience('')
        setSearch('')
    }

    // ✅ DROPDOWNS FROM REAL DATA
    const categories = [...new Set(jobs.map(j => j.job_category).filter(Boolean))]
    const salaryOptions = [...new Set(jobs.map(j => j["salary for filter"]).filter(Boolean))]
    const experienceOptions = [...new Set(jobs.map(j => j["experience for filter"]).filter(Boolean))]

    // ✅ PAGINATION LOGIC
    const indexOfLastJob = currentPage * jobsPerPage
    const indexOfFirstJob = indexOfLastJob - jobsPerPage
    const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob)
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage)

    return (
        <>
            <Navbar />

            <div className="container" style={{ padding: '40px 20px' }}>

                {/* HEADER */}
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
                        Find High-Paying <span style={{ color: 'var(--primary)' }}>USD Jobs</span>
                    </h1>

                    <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: '#9ca3af' }} />
                        <input
                            className="input"
                            placeholder="Search by job title or company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '48px', paddingRight: '20px', height: '52px' }}
                        />
                    </div>
                </div>

                {/* ✅ FILTER BAR */}
                <div className="filters-bar" style={{ justifyContent: 'center' }}>

                    <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">All Categories</option>
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <select className="select" value={salary} onChange={(e) => setSalary(e.target.value)}>
                        <option value="">Any Salary</option>
                        {salaryOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <select className="select" value={experience} onChange={(e) => setExperience(e.target.value)}>
                        <option value="">Any Experience</option>
                        {experienceOptions.map(e => (
                            <option key={e} value={e}>{e}</option>
                        ))}
                    </select>

                    {(category || salary || experience || search) && (
                        <button className="btn btn-secondary" onClick={clearFilters}>
                            <X size={16} style={{ marginRight: '4px' }} /> Clear
                        </button>
                    )}
                </div>

                {/* ✅ JOB LIST */}
                <div style={{ display: 'grid', gap: '16px' }}>
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="card" style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                Loading...
                            </div>
                        ))
                    ) : currentJobs.length > 0 ? (
                        currentJobs.map(job => (
                            <JobCard key={job.id} job={job} />
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                            <h3>No jobs found matching your criteria.</h3>
                            <p>Try clearing filters or searching for something else.</p>
                        </div>
                    )}
                </div>

                {/* ✅ PAGINATION UI */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '40px' }}>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className="btn"
                                style={{
                                    background: currentPage === i + 1 ? '#045149' : '#fff',
                                    color: currentPage === i + 1 ? '#fff' : '#000',
                                    border: '1px solid #000',
                                    minWidth: '44px'
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}

                        {currentPage < totalPages && (
                            <button
                                className="btn"
                                style={{ border: '1px solid #000' }}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Next
                            </button>
                        )}
                    </div>
                )}

            </div>
        </>
    )
}
