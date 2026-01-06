import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom" // ✅ NEW
import Navbar from "../components/Navbar"
import JobCard from "../components/JobCard"
import { Search, X, TrendingUp } from "lucide-react"
import { useJobs } from "../hooks/useJobs"

/**
 * Dashboard
 * - UI only
 * - No Supabase calls
 * - No auth logic
 * - No race conditions
 * - ✅ Persists pagination in URL
 */
export default function Dashboard() {
  const { jobs, loading, error, refresh } = useJobs()
  const [searchParams, setSearchParams] = useSearchParams() // ✅ NEW

  // 🔎 Filters
  const [category, setCategory] = useState("")
  const [salary, setSalary] = useState("")
  const [experience, setExperience] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("latest") // ✅ Sort option

  // 📄 Pagination - ✅ Read from URL, default to 1
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(searchParams.get('page')) || 1
    return page
  })

  const JOBS_PER_PAGE = 10

  // ✅ Sync URL when page changes
  useEffect(() => {
    if (currentPage === 1) {
      searchParams.delete('page') // Remove page param if it's 1
    } else {
      searchParams.set('page', currentPage.toString())
    }
    setSearchParams(searchParams, { replace: true })
  }, [currentPage])

  // 🔁 Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
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

    // ✅ SORT BY SERIAL OR DATE
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

  // 🧹 Clear filters
  const clearFilters = () => {
    setCategory("")
    setSalary("")
    setExperience("")
    setSearch("")
    setSortBy("latest")
  }

  // ✅ Get max serial for "NEW" badge detection
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
              onChange={e => setSearch(e.target.value)}
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
          {/* ✅ Sort Dropdown */}
          <select
            className="select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ fontWeight: sortBy === "latest" ? "600" : "400" }}
          >
            <option value="latest">🔥 Latest First</option>
            <option value="oldest">📅 Oldest First</option>
            <option value="company">🏢 Company A-Z</option>
          </select>

          <select
            className="select"
            value={category}
            onChange={e => setCategory(e.target.value)}
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
            onChange={e => setSalary(e.target.value)}
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
            onChange={e => setExperience(e.target.value)}
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

        {/* ✅ Results Count */}
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
                isNew={job.serial && job.serial >= maxSerial - 5} // ✅ Mark top 5 as new
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
                onClick={() => setCurrentPage(i + 1)}
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
                onClick={() => setCurrentPage(p => p + 1)}
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
