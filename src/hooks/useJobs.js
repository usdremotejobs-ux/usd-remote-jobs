import { useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

let JOBS_CACHE = null
let LAST_FETCH_AT = null
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

export function useJobs() {
  const { user, authLoading } = useAuth()

  const [jobs, setJobs] = useState(JOBS_CACHE || [])
  const [loading, setLoading] = useState(!JOBS_CACHE)
  const [error, setError] = useState(null)

  const isFetching = useRef(false)

  const fetchJobs = async ({ force = false } = {}) => {
    if (!user) return
    if (isFetching.current) return

    // 🧠 Cache check
    if (
      !force &&
      JOBS_CACHE &&
      LAST_FETCH_AT &&
      Date.now() - LAST_FETCH_AT < CACHE_TTL
    ) {
      setJobs(JOBS_CACHE)
      setLoading(false)
      return
    }

    isFetching.current = true
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Jobs fetch failed:", error)
      setError("Failed to load jobs. Please refresh.")
      setLoading(false)
      isFetching.current = false
      return
    }

    JOBS_CACHE = data || []
    LAST_FETCH_AT = Date.now()

    setJobs(JOBS_CACHE)
    setLoading(false)
    isFetching.current = false
  }

  // ✅ Fetch only when auth is READY
  useEffect(() => {
    if (!authLoading && user) {
      fetchJobs()
    }
  }, [authLoading, user])

  return {
    jobs,
    loading,
    error,
    refresh: () => fetchJobs({ force: true }),
  }
}
