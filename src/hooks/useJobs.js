import { useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

// ✅ LOCALSTORAGE CACHE
const CACHE_KEY = 'jobs_cache'
const CACHE_TIMESTAMP_KEY = 'jobs_cache_timestamp'
const CACHE_TTL = 1000 * 60 * 10 // 10 minutes (increased from 5)

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
      console.log('✅ Loaded jobs from localStorage cache')
    }
  }
} catch (err) {
  console.error('Failed to load jobs cache:', err)
}

export function useJobs() {
  const { user, authLoading } = useAuth()

  const [jobs, setJobs] = useState(JOBS_CACHE || [])
  const [loading, setLoading] = useState(false) // ✅ Changed: Don't show loading if we have cache
  const [error, setError] = useState(null)

  const isFetching = useRef(false)
  const hasInitialFetch = useRef(false)

  const fetchJobs = async ({ force = false, silent = false } = {}) => {
    if (!user) {
      setLoading(false)
      return
    }
    
    if (isFetching.current) {
      return
    }

    // 🧠 Cache check
    if (
      !force &&
      JOBS_CACHE &&
      LAST_FETCH_AT &&
      Date.now() - LAST_FETCH_AT < CACHE_TTL
    ) {
      if (!hasInitialFetch.current) {
        setJobs(JOBS_CACHE)
        hasInitialFetch.current = true
      }
      setLoading(false)
      return
    }

    // ✅ OPTIMISTIC: If we have cache, show it and fetch silently
    if (JOBS_CACHE && JOBS_CACHE.length > 0) {
      setJobs(JOBS_CACHE)
      if (!silent) {
        setLoading(false) // Don't show loading spinner
      }
    } else {
      setLoading(true) // Only show loading if no cache
    }

    isFetching.current = true
    setError(null)

    try {
      // ✅ AGGRESSIVE TIMEOUT
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 3000)
      )

      const fetchPromise = supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error) {
        console.error("❌ Jobs fetch failed:", error)
        // If we have cache, don't show error - just use cache
        if (JOBS_CACHE && JOBS_CACHE.length > 0) {
          console.log("⚠️ Using cached jobs due to fetch error")
          setJobs(JOBS_CACHE)
        } else {
          setError("Failed to load jobs. Please refresh.")
        }
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
      hasInitialFetch.current = true
    } catch (err) {
      console.error("❌ Jobs fetch error:", err)
      
      // If timeout and we have cache, use it
      if (err.message === 'Request timeout' && JOBS_CACHE && JOBS_CACHE.length > 0) {
        console.log("⏱️ Timeout - using cached jobs")
        setJobs(JOBS_CACHE)
        setLoading(false)
      } else {
        setError(err.message === 'Request timeout' 
          ? "Request timed out. Using cached data." 
          : "Failed to load jobs.")
        setLoading(false)
      }
    } finally {
      isFetching.current = false
    }
  }

  // ✅ Fetch when auth is ready
  useEffect(() => {
    if (!authLoading && user) {
      // If we already have cache, fetch silently in background
      const hasCachedData = JOBS_CACHE && JOBS_CACHE.length > 0
      fetchJobs({ silent: hasCachedData })
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
