import { useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import Navbar from "../components/Navbar"
import JobCard from "../components/JobCard"
import { Search, X, TrendingUp } from "lucide-react"
import { useJobs } from "../hooks/useJobs"

/**
 * Dashboard
 * - Pagination state stored in URL (?page=3)
 * - Survives navigation and refresh
 */
export default function Dashboard() {
  const { jobs, loading, error, refresh } = useJobs()
  const [searchParams, setSearchParams] = useSearchParams()

  // 📄 Read page from URL (reactive)
  const currentPage = parseInt(searchParams.get('page')) || 1
  
  // 🐛 DEBUG - Remove after testing
  console.log('🔍 Dashboard render:', {
    url: window.location.href,
    pageParam: searchParams.get('page'),
    currentPage,
    searchParamsString: searchParams.toString()
  })
  
  // 🔎 Filters
  const category = searchParams.get('category') || ""
  const salary = searchParams.get('salary') || ""
  const experience = searchParams.get('experience') || ""
  const search = searchParams.get('q') || ""
  const sortBy = searchParams.get('sort') || "latest"

  const JOBS_PER_PAGE = 10

  // ✅ Helper to update URL params
  const updateParams = (updates) => {
    console.log('📝 updateParams called with:', updates) // 🐛 DEBUG
    
    const newParams = new URLSearchParams(searchParams)
    
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "" || value === "latest" || value === 1) {
        newParams.delete(key)
      } else {
        newParams.set(key, value.toString())
      }
    })
    
    console.log('📝 New URL will be:', newParams.toString()) // 🐛 DEBUG
    setSearchParams(newParams, { replace: true })
  }

  // 🔁 Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      updateParams({ page: 1 })
    }
  }, [category, salary, experience, search, sortBy])

  // 🧠 Derived filter options (from real data)
  const categories = useMemo(
    () => [...new Set(jobs.map(j => j.job_category).filter(Boolean))],
    [jobs]
  )

  const salaryOptions = useMemo(
    () => [...new Set(jobs.map(j => j["salary for filter"]).filter(Boolean))],
    [jobs]
  )

  const experienceOptions = useMemo(
    () => [...new Set(jobs.map(j => j["experience for filter"]).filter(Boolean))],
    [jobs]
  )

  // 🔍 Filtered and Sorted jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs]

    if (category) {
      result = result.filter(j => j.job_category === category)
    }

    if (salary) {
      result = result.filter(j => j["salary for filter"] === salary)
    }

    if (experience) {
      result = result.filter(j => j["experience for filter"] === experience)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q)
      )
    }

    // Sort by serial
    if (sortBy === "latest") {
      result.sort((a, b) => (b.serial || 0) - (a.serial || 0))
    } else if (sortBy === "oldest") {
      result.sort((a, b) => (a.serial || 0) - (b.serial || 0))
    } else if (sortBy === "company") {
      result.sort((a, b) => (a.company || "").localeCompare(b.company || ""))
    }

    return result
  }, [jobs, category, salary, experience, search, sortBy])

  // 📄 Pagination logic
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE)
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE
  const currentJobs = filteredJobs.slice(
    startIndex,
    startIndex + JOBS_PER_PAGE
  )

  // 🧹 Clear all filters
  const clearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  // ✅ Get max serial for "NEW" badge
  const maxSerial = useMemo(() => {
    return Math.max(...jobs.map(j => j.serial || 0), 0)
  }, [jobs])

  return (
    <>
      <Navbar />

      <div className="container" style={{ padding: "40px 20px" }}>
        {/* HEADER */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "16px" }}>
            Find High-Paying{" "}
            <span style={{ color: "var(--primary)" }}>USD Jobs</span>
          </h1>

          <div style={{ maxWidth: "600px", margin: "0 auto", position: "relative" }}>
            <Search
              size={20}
              style={{
                position: "absolute",
                left: "16px",
                top: "16px",
                color: "#9ca3af",
              }}
            />
            <input
              className="input"
              placeholder="Search by job title or company..."
              value={search}
              onChange={e => updateParams({ q: e.target.value, page: 1 })}
              style={{
                paddingLeft: "48px",
                paddingRight: "20px",
                height: "52px",
              }}
            />
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="filters-bar" style={{ justifyContent: "center" }}>
          <select
            className="select"
            value={sortBy}
            onChange={e => updateParams({ sort: e.target.value, page: 1 })}
            style={{ fontWeight: sortBy === "latest" ? "600" : "400" }}
          >
            <option value="latest">🔥 Latest First</option>
            <option value="oldest">📅 Oldest First</option>
            <option value="company">🏢 Company A-Z</option>
          </select>

          <select
            className="select"
            value={category}
            onChange={e => updateParams({ category: e.target.value, page: 1 })}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={salary}
            onChange={e => updateParams({ salary: e.target.value, page: 1 })}
          >
            <option value="">Any Salary</option>
            {salaryOptions.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={experience}
            onChange={e => updateParams({ experience: e.target.value, page: 1 })}
          >
            <option value="">Any Experience</option>
            {experienceOptions.map(e => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          {(category || salary || experience || search || sortBy !== "latest") && (
            <button className="btn btn-secondary" onClick={clearFilters}>
              <X size={16} style={{ marginRight: "4px" }} /> Clear
            </button>
          )}
        </div>

        {/* Results Count */}
        {!loading && !error && (
          <div style={{ textAlign: "center", margin: "20px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {filteredJobs.length === jobs.length ? (
              <span>Showing all {jobs.length} jobs</span>
            ) : (
              <span>Found {filteredJobs.length} of {jobs.length} jobs</span>
            )}
            {totalPages > 1 && <span> • Page {currentPage} of {totalPages}</span>}
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className="card" style={{ textAlign: "center", marginTop: "40px" }}>
            <p style={{ marginBottom: "12px" }}>{error}</p>
            <button className="btn" onClick={refresh}>
              Retry
            </button>
          </div>
        )}

        {/* JOB LIST */}
        <div style={{ display: "grid", gap: "16px", marginTop: "24px" }}>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="card skeleton"
                style={{ height: "120px" }}
              />
            ))
          ) : currentJobs.length > 0 ? (
            currentJobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                isNew={job.serial && job.serial >= maxSerial - 5}
              />
            ))
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                color: "var(--text-muted)",
              }}
            >
              <h3>No jobs found.</h3>
              <p>Try clearing filters or searching something else.</p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && !loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "40px",
              flexWrap: "wrap",
            }}
          >
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => updateParams({ page: i + 1 })}
                className="btn"
                style={{
                  background: currentPage === i + 1 ? "#045149" : "#fff",
                  color: currentPage === i + 1 ? "#fff" : "#000",
                  border: "1px solid #000",
                  minWidth: "44px",
                }}
              >
                {i + 1}
              </button>
            ))}

            {currentPage < totalPages && (
              <button
                className="btn"
                style={{ border: "1px solid #000" }}
                onClick={() => updateParams({ page: currentPage + 1 })}
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
