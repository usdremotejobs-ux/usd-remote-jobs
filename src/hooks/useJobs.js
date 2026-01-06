import { useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

// ✅ LOCALSTORAGE CACHE
const CACHE_KEY = 'jobs_cache'
const CACHE_TIMESTAMP_KEY = 'jobs_cache_timestamp'
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

// Try to load from localStorage on import
let JOBS_CACHE = null
let LAST_FETCH_AT = null

try {
  const cached = localStorage.getItem(CACHE_KEY)
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
  
  if (cached && timestamp) {
    const age = Date.now() - parseInt(timestamp)
    if (age < CACHE_TTL) {
      JOBS_CACHE = JSON.parse(cached)
      LAST_FETCH_AT = parseInt(timestamp)
      console.log('Loaded jobs from localStorage cache')
    }
  }
} catch (err) {
  console.error('Failed to load jobs cache:', err)
}

export function useJobs() {
  const { user, authLoading } = useAuth()

  const [jobs, setJobs] = useState(JOBS_CACHE || [])
  const [loading, setLoading] = useState(!JOBS_CACHE)
  const [error, setError] = useState(null)

  const isFetching = useRef(false)

  const fetchJobs = async ({ force = false } = {}) => {
    if (!user) {
      setLoading(false)
      return
    }
    
    if (isFetching.current) {
      return
    }

    // 🧠 Cache check - OPTIMISTIC: show cached data immediately
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

    // ✅ OPTIMISTIC: If we have cache, show it while fetching fresh data
    if (JOBS_CACHE && JOBS_CACHE.length > 0 && !force) {
      setJobs(JOBS_CACHE)
      setLoading(false) // Don't show loading if we have cached data
    } else {
      setLoading(true)
    }

    isFetching.current = true
    setError(null)

    try {
      // ✅ FASTER TIMEOUT
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 4000)
      )

      const fetchPromise = supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error) {
        console.error("❌ Jobs fetch failed:", error)
        setError("Failed to load jobs. Please refresh.")
        setLoading(false)
        isFetching.current = false
        return
      }

      JOBS_CACHE = data || []
      LAST_FETCH_AT = Date.now()

      // ✅ SAVE TO LOCALSTORAGE
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(JOBS_CACHE))
        localStorage.setItem(CACHE_TIMESTAMP_KEY, LAST_FETCH_AT.toString())
      } catch (err) {
        console.error('Failed to cache jobs:', err)
      }

      setJobs(JOBS_CACHE)
      setLoading(false)
    } catch (err) {
      console.error("❌ Jobs fetch error:", err)
      setError(err.message === 'Request timeout' 
        ? "Request timed out. Please refresh." 
        : "Failed to load jobs. Please refresh.")
      setLoading(false)
    } finally {
      isFetching.current = false
    }
  }

  // ✅ Fetch only when auth is READY
  useEffect(() => {
    if (!authLoading && user) {
      fetchJobs()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [authLoading, user])

  return {
    jobs,
    loading,
    error,
    refresh: () => fetchJobs({ force: true }),
  }
}
