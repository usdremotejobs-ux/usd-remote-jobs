import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

// ✅ CACHE KEYS
const CACHE_KEYS = {
  SUBSCRIPTION: 'app_subscription_cache',
  TIMESTAMP: 'app_subscription_timestamp'
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  // ✅ FIX 1: Lazy initializer — reads localStorage synchronously on first render
  // so subscription is already populated BEFORE the first paint, not after a useEffect.
  const [subscription, setSubscription] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.SUBSCRIPTION)
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        if (age < 5 * 60 * 1000) {
          const parsedSub = JSON.parse(cached)
          console.log('Subscription loaded synchronously from cache')
          return parsedSub
        }
      }
    } catch (err) {
      console.error('Failed to load subscription cache:', err)
    }
    return null
  })
  const [authLoading, setAuthLoading] = useState(true)
  // ✅ FIX 2: Separate loading state for the subscription DB fetch.
  // Stays true until fetchSubscription resolves, so ProtectedRoute never
  // mistakes "fetch in progress" for "user has no subscription".
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  
  const subscriptionCache = useRef(null)
  const retryCount = useRef(0)
  const maxRetries = 2
  // ✅ FIX 4: Prevent double-fetch from bootstrap() + onAuthStateChange racing on initial load
  const hasFetchedSubscription = useRef(false)
  const lastFetchedEmail = useRef(null)

  // ✅ FIX 1: Sync the in-memory ref with whatever the lazy initializer loaded
  // so subscriptionCache.current is always consistent with state from the start.
  const [_initSub] = useState(() => {
    const s = subscription // closure captures the lazy-initialized value
    if (s) subscriptionCache.current = s
    return null // unused return, just running the side-effect synchronously
  })

  const fetchSubscription = async (email, isInitialLoad = false) => {
    // ✅ FIX: Tracks whether we are about to recurse into a retry.
    // The finally block must NOT clear subscriptionLoading if a retry is
    // still pending — otherwise ProtectedRoute sees loading=false+subscription=null
    // and redirects to /upgrade before the retry has a chance to resolve.
    let isRetrying = false

    if (!email) {
      setSubscription(null)
      subscriptionCache.current = null
      localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
      localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
      setSubscriptionLoading(false)
      return
    }

    setSubscriptionLoading(true)

    try {
      // ✅ FASTER TIMEOUT
      const timeoutDuration = isInitialLoad ? 5000 : 3000
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Subscription fetch timeout')), timeoutDuration)
      )

      const fetchPromise = supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      retryCount.current = 0

      if (error && error.code !== 'PGRST116') {
        console.error("Subscription fetch error:", error)
        
        if (subscriptionCache.current) {
          console.log("Using cached subscription due to error")
          setSubscription(subscriptionCache.current)
        } else {
          setSubscription(null)
        }
        return
      }

      if (!data) {
        setSubscription(null)
        subscriptionCache.current = null
        localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
        localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
        return
      }

      // Validate subscription
      let validSubscription = null

      if (data.plan === "lifetime" && data.status === "active") {
        validSubscription = data
      } else {
        const today = new Date()
        const expiry = new Date(data.expiry_date)

        if (data.status === "active" && expiry >= today) {
          validSubscription = data
        }
      }

      setSubscription(validSubscription)
      subscriptionCache.current = validSubscription

      // ✅ SAVE TO LOCALSTORAGE
      if (validSubscription) {
        localStorage.setItem(CACHE_KEYS.SUBSCRIPTION, JSON.stringify(validSubscription))
        localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString())
      } else {
        localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
        localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
      }

    } catch (err) {
      console.error("Subscription fetch error:", err)
      
      if (isInitialLoad && retryCount.current < maxRetries) {
        retryCount.current++
        console.log(`Retrying subscription fetch (${retryCount.current}/${maxRetries})...`)
        // ✅ FIX: Signal BEFORE the await so finally knows not to clear loading.
        // JS runs finally when this function returns/throws — if we set isRetrying
        // after the await, finally may have already fired.
        isRetrying = true
        await new Promise(resolve => setTimeout(resolve, 800))
        return fetchSubscription(email, isInitialLoad)
      }
      
      if (err.message === 'Subscription fetch timeout' && subscriptionCache.current) {
        console.log("Timeout - using cached subscription")
        setSubscription(subscriptionCache.current)
      } else if (!subscriptionCache.current) {
        setSubscription(null)
      }
    } finally {
      // Only clear loading if we are NOT about to retry.
      // If isRetrying=true, the recursive call owns subscriptionLoading from here on.
      if (!isRetrying) setSubscriptionLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let bootstrapTimeout = null

    const bootstrap = async () => {
      try {
        // ✅ FASTER TIMEOUT
        bootstrapTimeout = setTimeout(() => {
          if (mounted && authLoading) {
            console.warn("Auth bootstrap timeout - forcing completion")
            setAuthLoading(false)
          }
        }, 6000)

        const { data } = await supabase.auth.getSession()
        if (!mounted) return

        const currentUser = data.session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          // ✅ FIX 4: Claim the fetch so onAuthStateChange's INITIAL_SESSION skips it
          hasFetchedSubscription.current = true
          lastFetchedEmail.current = currentUser.email
          await fetchSubscription(currentUser.email, true)
        } else {
          // No user — no fetch will happen, clear loading immediately
          setSubscription(null)
          setSubscriptionLoading(false)
          subscriptionCache.current = null
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
          localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
        }
      } catch (err) {
        console.error("Auth bootstrap failed", err)
        if (mounted) {
          setUser(null)
          setSubscriptionLoading(false)
          if (!subscriptionCache.current) {
            setSubscription(null)
          }
        }
      } finally {
        if (bootstrapTimeout) clearTimeout(bootstrapTimeout)
        if (mounted) setAuthLoading(false)
      }
    }

    bootstrap()

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log("Auth state change:", event)

      try {
        if (event === 'TOKEN_REFRESHED') {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          
          if (currentUser?.email) {
            await fetchSubscription(currentUser.email, false)
          }
          return
        }

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSubscription(null)
          subscriptionCache.current = null
          // ✅ FIX: Reset dedup flag so the next SIGNED_IN always re-fetches.
          // Without this, after a token-refresh SIGNED_OUT the subsequent SIGNED_IN
          // would be skipped by Fix 4's check, leaving subscription=null while
          // user is set — causing a false redirect to /upgrade.
          hasFetchedSubscription.current = false
          lastFetchedEmail.current = null
          // ✅ Keep subscriptionLoading=true so ProtectedRoute shows a loader
          // (not /upgrade) during the gap between SIGNED_OUT and the next fetch.
          setSubscriptionLoading(true)
          // ✅ FIX 3: Do NOT clear localStorage here.
          // SIGNED_OUT fires for both intentional logouts AND silent token-refresh
          // failures (e.g. user's tab was in the background). Wiping the cache in
          // the failure case means the next login has no fallback, causing a false
          // redirect to /upgrade while the fresh DB fetch is in-flight.
          // The explicit logout() function below handles intentional cache clearing.
          return
        }

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          // ✅ FIX 4: Skip if bootstrap() already fetched for this exact email
          // (covers INITIAL_SESSION racing with bootstrap on page load)
          // Always fetch for genuinely new sign-ins (different email)
          if (hasFetchedSubscription.current && lastFetchedEmail.current === currentUser.email) {
            console.log('Skipping duplicate subscription fetch (already claimed by bootstrap)')
            // bootstrap owns the fetch — don't touch subscriptionLoading here
          } else {
            hasFetchedSubscription.current = true
            lastFetchedEmail.current = currentUser.email
            await fetchSubscription(currentUser.email, false)
          }
        } else {
          // No user — no fetch will happen, clear loading immediately
          setSubscription(null)
          setSubscriptionLoading(false)
          subscriptionCache.current = null
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
          localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
        }
      } catch (err) {
        console.error("Auth state change error:", err)
      } finally {
        if (mounted && event !== 'TOKEN_REFRESHED') {
          setAuthLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      if (bootstrapTimeout) clearTimeout(bootstrapTimeout)
      authSub.unsubscribe()
    }
  }, [])

  const logout = async () => {
    // ✅ FIX 3: Clear cache HERE (intentional logout) rather than in the SIGNED_OUT
    // event handler (which also fires for accidental token-refresh failures).
    localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
    localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
    await supabase.auth.signOut()
    setUser(null)
    setSubscription(null)
    subscriptionCache.current = null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        authLoading,
        subscriptionLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
