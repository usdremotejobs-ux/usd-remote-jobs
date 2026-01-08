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
  const retryCount = useRef(0)
  const maxRetries = 2

  // ✅ LOAD FROM LOCALSTORAGE on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.SUBSCRIPTION)
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        // Use cache if less than 5 minutes old
        if (age < 5 * 60 * 1000) {
          const parsedSub = JSON.parse(cached)
          subscriptionCache.current = parsedSub
          setSubscription(parsedSub)
          console.log('Loaded subscription from cache')
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
        await new Promise(resolve => setTimeout(resolve, 800))
        return fetchSubscription(email, isInitialLoad)
      }
      
      if (err.message === 'Subscription fetch timeout' && subscriptionCache.current) {
        console.log("Timeout - using cached subscription")
        setSubscription(subscriptionCache.current)
      } else if (!subscriptionCache.current) {
        setSubscription(null)
      }
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
          await fetchSubscription(currentUser.email, true)
        } else {
          setSubscription(null)
          subscriptionCache.current = null
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
          localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
        }
      } catch (err) {
        console.error("Auth bootstrap failed", err)
        if (mounted) {
          setUser(null)
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
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
          localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
          return
        }

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
    await supabase.auth.signOut()
    setUser(null)
    setSubscription(null)
    subscriptionCache.current = null
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
