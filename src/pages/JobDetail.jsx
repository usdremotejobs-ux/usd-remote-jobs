import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { JOB_CACHE, CACHE_KEY_PREFIX, CACHE_TTL } from "../utils/jobCache"
import Navbar from "../components/Navbar"
import {
  Briefcase,
  DollarSign,
  Clock,
  ArrowLeft,
  ExternalLink,
} from "lucide-react"

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleBack = () => {
    if (location.state?.from) {
      navigate(`/dashboard${location.state.from}`)
    } else {
      navigate("/dashboard")
    }
  }

  useEffect(() => {
    let active = true
    let timeoutId = null

    const fetchJob = async () => {
      try {
        let cached = JOB_CACHE.get(id)

        if (!cached) {
          const localData = localStorage.getItem(CACHE_KEY_PREFIX + id)
          if (localData) {
            cached = JSON.parse(localData)
            JOB_CACHE.set(id, cached)
          }
        }

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setJob(cached.data)
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)

        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Request timeout")), 4000)
        })

        const fetchPromise = supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .single()

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

        if (!active) return

        if (error) {
          setError("Job not found")
          return
        }

        const cacheEntry = { data, timestamp: Date.now() }
        JOB_CACHE.set(id, cacheEntry)
        localStorage.setItem(CACHE_KEY_PREFIX + id, JSON.stringify(cacheEntry))

        setJob(data)
      } catch (err) {
        setError(
          err.message === "Request timeout"
            ? "Request timed out. Please refresh."
            : "Something went wrong"
        )
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        if (active) setLoading(false)
      }
    }

    fetchJob()
    return () => {
      active = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [id])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          Loading Job Details…
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <p>{error}</p>
          <button className="btn" onClick={handleBack}>Back to Jobs</button>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />

      {/* 🔽 MAIN CONTAINER */}
      <div
        className="container job-detail-container"
        style={{ padding: "40px 20px", maxWidth: "900px" }}
      >
        <button
          onClick={handleBack}
          className="btn"
          style={{ marginBottom: "20px", paddingLeft: 0, color: "var(--text-muted)" }}
        >
          <ArrowLeft size={18} style={{ marginRight: "8px" }} />
          Back to Jobs
        </button>

        {/* 🔽 HEADER */}
        <div
          className="card job-header-card"
          style={{ padding: "32px", marginBottom: "32px", textAlign: "center" }}
        >
          <div
            className="job-header-logo"
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 16px",
              background: "#f3f4f6",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={job.company}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  padding: "8px",
                }}
              />
            ) : (
              <Briefcase size={32} color="#9ca3af" />
            )}
          </div>

          <h1 className="job-header-title" style={{ fontSize: "2rem", marginBottom: "8px" }}>
            {job.title}
          </h1>

          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            {job.company}
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            {job.salary && <span className="badge badge-green"><DollarSign size={14} /> {job.salary}</span>}
            {job.job_category && <span className="badge badge-blue"><Briefcase size={14} /> {job.job_category}</span>}
            {job.experience && <span className="badge badge-purple"><Clock size={14} /> {job.experience}</span>}
          </div>
        </div>

        {/* 🔽 CONTENT */}
        <div className="job-content-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "40px" }}>
          <div className="card" style={{ padding: "32px" }}>
            <Section title="Job Details" content={job.job_details} />
            <Section title="Requirements" content={job.requirements} />
            <Section title="Benefits" content={job.benefits} />
            <Section title="About Company" content={job.about_company} />
          </div>

          <div className="sticky-sidebar">
            <div className="card" style={{ padding: "24px", position: "sticky", top: "100px" }}>
              <h3>Interested?</h3>
              <p style={{ color: "var(--text-muted)", margin: "16px 0" }}>
                Apply directly on the company website.
              </p>

              {job.apply_link ? (
                <a href={job.apply_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: "100%" }}>
                  Apply Now <ExternalLink size={16} style={{ marginLeft: "8px" }} />
                </a>
              ) : (
                <button disabled className="btn btn-secondary" style={{ width: "100%" }}>
                  Applications Closed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔽 MOBILE APPLY BAR */}
      <div className="mobile-apply-bar">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{job.title}</div>
          {job.apply_link ? (
            <a href={job.apply_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Apply
            </a>
          ) : (
            <button disabled className="btn btn-secondary">Closed</button>
          )}
        </div>
      </div>

      {/* 🔽 MOBILE CSS */}
      <style>{`
        @media (max-width: 900px) {
          .job-content-grid {
            grid-template-columns: 1fr !important;
          }
          .sticky-sidebar {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .job-detail-container {
            padding: 20px 16px !important;
          }

          .job-header-card {
            padding: 20px !important;
          }

          .job-header-logo {
            width: 64px !important;
            height: 64px !important;
          }

          .job-header-title {
            font-size: 1.5rem !important;
          }
        }

        .mobile-apply-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          padding: 8px 0;
          border-top: 1px solid var(--border);
          box-shadow: 0 -4px 10px rgba(0,0,0,0.05);
          display: none;
          z-index: 100;
        }

        @media (max-width: 768px) {
          .mobile-apply-bar {
            display: block;
          }

          .mobile-apply-bar .container {
            padding: 0 16px;
          }

          .container {
            padding-bottom: 72px;
          }
        }
      `}</style>
    </>
  )
}

function Section({ title, content }) {
  if (!content) return null

  return (
    <div style={{ marginBottom: "32px" }}>
      <h3 style={{ marginBottom: "16px", borderBottom: "2px solid #f3f4f6", paddingBottom: "8px" }}>
        {title}
      </h3>
      <div style={{ lineHeight: "1.7", whiteSpace: "pre-line" }}>
        {content}
      </div>
    </div>
  )
}
