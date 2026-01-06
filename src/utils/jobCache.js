// ✅ SHARED JOB CACHE - No circular dependencies
// Both JobCard and JobDetail import from here

export const CACHE_KEY_PREFIX = 'job_detail_'
export const CACHE_TTL = 1000 * 60 * 10 // 10 minutes

// ✅ Memory cache for quick access during session
export const JOB_CACHE = new Map()

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
