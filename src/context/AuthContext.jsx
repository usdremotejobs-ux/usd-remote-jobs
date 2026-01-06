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
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  const subscriptionCache = useRef(null)
  const hasInitialized = useRef(false)
  const isFetchingSubscription = useRef(false) // ✅ Prevent duplicate fetches
  const lastFetchEmail = useRef(null) // ✅ Track last fetched email

  // ✅ LOAD FROM LOCALSTORAGE IMMEDIATELY on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.SUBSCRIPTION)
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        // Use cache if less than 10 minutes old
        if (age < 10 * 60 * 1000) {
          const parsedSub = JSON.parse(cached)
          subscriptionCache.current = parsedSub
          setSubscription(parsedSub)
          console.log('✅ Loaded subscription from cache')
        }
      }
    } catch (err) {
      console.error('Failed to load cache:', err)
    }
  }, [])

  const fetchSubscription = async (email, isInitialLoad = false) => {
    if (!email) {
      setSubscription(null)
      subscriptionCache.current = null
      localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
      localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
      return
    }

    // ✅ PREVENT DUPLICATE FETCHES
    if (isFetchingSubscription.current && lastFetchEmail.current === email) {
      console.log('⏭️ Skipping duplicate subscription fetch')
      return
    }

    isFetchingSubscription.current = true
    lastFetchEmail.current = email

    try {
      // ✅ FAST TIMEOUT
      const timeoutDuration = 2500 // 2.5 seconds
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Subscription fetch timeout')), timeoutDuration)
      )

      const fetchPromise = supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error && error.code !== 'PGRST116') {
        console.error("Subscription fetch error:", error)
        
        if (subscriptionCache.current) {
          console.log("⚠️ Using cached subscription due to error")
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
      
      if (err.message === 'Subscription fetch timeout' && subscriptionCache.current) {
        console.log("⏱️ Timeout - using cached subscription")
        setSubscription(subscriptionCache.current)
      } else if (!subscriptionCache.current) {
        setSubscription(null)
      }
    } finally {
      isFetchingSubscription.current = false
    }
  }

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        // ✅ OPTIMISTIC: If we have cached subscription, unlock UI immediately
        const hasCachedSubscription = subscriptionCache.current !== null
        
        if (hasCachedSubscription && !hasInitialized.current) {
          console.log("⚡ Fast path: Using cached subscription")
          hasInitialized.current = true
          
          // Get session quickly and unlock UI
          const { data } = await supabase.auth.getSession()
          if (!mounted) return
          
          const currentUser = data.session?.user ?? null
          setUser(currentUser)
          
          // ✅ UNLOCK UI IMMEDIATELY
          setAuthLoading(false)
          
          // ✅ FIRE-AND-FORGET: Validate in background (completely non-blocking)
          if (currentUser?.email) {
            fetchSubscription(currentUser.email, true).catch(err => {
              console.error("Background subscription validation failed:", err)
            })
          }
          return
        }

        // ✅ SLOW PATH: No cache, must wait
        console.log("🐌 Slow path: No cache, fetching fresh data")
        
        const { data } = await supabase.auth.getSession()
        if (!mounted) return

        const currentUser = data.session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email, true)
        } else {
          setSubscription(null)
          subscriptionCache.current = null
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
          localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
        }
        
        hasInitialized.current = true
        
      } catch (err) {
        console.error("Auth bootstrap failed", err)
        if (mounted) {
          setUser(null)
          if (!subscriptionCache.current) {
            setSubscription(null)
          }
        }
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    bootstrap()

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log("🔐 Auth state change:", event)

      // ✅ IGNORE REDUNDANT EVENTS
      if (event === 'INITIAL_SESSION') {
        console.log("⏭️ Ignoring INITIAL_SESSION (already handled in bootstrap)")
        return
      }

      try {
        // ✅ TOKEN_REFRESHED: Just update user, don't refetch subscription
        if (event === 'TOKEN_REFRESHED') {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          // Don't fetch subscription - it doesn't change on token refresh
          return
        }

        // ✅ SIGNED_OUT: Clear everything
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSubscription(null)
          subscriptionCache.current = null
          isFetchingSubscription.current = false
          lastFetchEmail.current = null
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
          localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
          return
        }

        // ✅ SIGNED_IN: Only fetch if it's a NEW user (not duplicate event)
        if (event === 'SIGNED_IN') {
          const currentUser = session?.user ?? null
          
          // If same user, skip refetch
          if (user && currentUser?.email === user?.email) {
            console.log("⏭️ Ignoring duplicate SIGNED_IN event")
            return
          }
          
          setUser(currentUser)

          if (currentUser?.email) {
            // Fire-and-forget if we have cache
            if (subscriptionCache.current) {
              fetchSubscription(currentUser.email, false).catch(err => {
                console.error("Background refresh failed:", err)
              })
            } else {
              await fetchSubscription(currentUser.email, false)
            }
          } else {
            setSubscription(null)
            subscriptionCache.current = null
            localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
            localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
          }
          return
        }

        // ✅ OTHER EVENTS: Handle normally
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email, false)
        } else {
          setSubscription(null)
          subscriptionCache.current = null
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
          localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
        }
      } catch (err) {
        console.error("Auth state change error:", err)
      }
    })

    return () => {
      mounted = false
      authSub.unsubscribe()
    }
  }, [user]) // ✅ Add user to deps to detect duplicate SIGNED_IN events

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSubscription(null)
    subscriptionCache.current = null
    hasInitialized.current = false
    isFetchingSubscription.current = false
    lastFetchEmail.current = null
    localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
    localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        authLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
