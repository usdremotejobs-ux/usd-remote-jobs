import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

const CACHE_KEYS = {
  SUBSCRIPTION: 'app_subscription_cache',
  TIMESTAMP: 'app_subscription_timestamp'
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  const subscriptionCache = useRef(null)
  const isFetchingSubscription = useRef(false)
  const lastFetchEmail = useRef(null)

  // Helper to compare users and prevent re-renders if they are identical
  const safeSetUser = (newUser) => {
    setUser(prevUser => {
      // If both are null, no change
      if (!prevUser && !newUser) return null
      // If one is null and other isn't, change
      if (!prevUser || !newUser) return newUser
      // If emails match, don't update state (prevents effect loops)
      if (prevUser.email === newUser.email && prevUser.id === newUser.id) {
        return prevUser
      }
      return newUser
    })
  }

  // ✅ LOAD FROM LOCALSTORAGE ON MOUNT
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.SUBSCRIPTION)
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        if (age < 10 * 60 * 1000) { // 10 mins
          const parsedSub = JSON.parse(cached)
          subscriptionCache.current = parsedSub
          // We don't setSubscription state here yet, we wait for auth to confirm user match
        }
      }
    } catch (err) {
      console.error('Failed to load cache:', err)
    }
  }, [])

  const fetchSubscription = async (email, isInitialLoad = false) => {
    if (!email) {
      setSubscription(null)
      return
    }

    // prevent race conditions
    if (isFetchingSubscription.current && lastFetchEmail.current === email) {
      return
    }

    isFetchingSubscription.current = true
    lastFetchEmail.current = email

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      if (error && error.code !== 'PGRST116') {
        // On error, if we have cache, keep using it
        if (subscriptionCache.current) {
            setSubscription(subscriptionCache.current)
        }
        return
      }

      let validSubscription = null
      if (data) {
          if (data.plan === "lifetime" && data.status === "active") {
            validSubscription = data
          } else {
            const today = new Date()
            const expiry = new Date(data.expiry_date)
            if (data.status === "active" && expiry >= today) {
              validSubscription = data
            }
          }
      }

      // Update State
      setSubscription(validSubscription)
      subscriptionCache.current = validSubscription

      // Update LocalStorage
      if (validSubscription) {
        localStorage.setItem(CACHE_KEYS.SUBSCRIPTION, JSON.stringify(validSubscription))
        localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString())
      } else {
        localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
        localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
      }

    } catch (err) {
      console.error("Subscription fetch error:", err)
    } finally {
      isFetchingSubscription.current = false
    }
  }

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        
        const currentUser = data.session?.user ?? null
        safeSetUser(currentUser)
        
        // Logic: If we have a user, we MUST fetch/verify subscription before releasing loading
        if (currentUser?.email) {
            
            // 1. Check if cache matches
            const cacheMatches = subscriptionCache.current?.email === currentUser.email
            
            if (cacheMatches) {
                // Optimistic: Set data immediately
                setSubscription(subscriptionCache.current)
                // Refresh in background
                fetchSubscription(currentUser.email)
            } else {
                // No cache match: Must await fetch
                await fetchSubscription(currentUser.email)
            }
        } else {
            setSubscription(null)
        }
        
      } catch (err) {
        console.error("Auth bootstrap failed", err)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    bootstrap()

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      const currentUser = session?.user ?? null
      safeSetUser(currentUser)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
         if (currentUser?.email) {
             // If we already have a subscription loaded for this exact email, don't re-fetch on simple token refresh
             if (subscriptionCache.current?.email === currentUser.email) {
                 if (!subscription) setSubscription(subscriptionCache.current)
             } else {
                 await fetchSubscription(currentUser.email)
             }
         }
      } else if (event === 'SIGNED_OUT') {
          setSubscription(null)
          subscriptionCache.current = null
          localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
      }
    })

    return () => {
      mounted = false
      authListener.unsubscribe()
    }
    // 🔴 CRITICAL FIX: Empty dependency array. Do not put [user] here.
  }, []) 

  const logout = async () => {
    await supabase.auth.signOut()
    safeSetUser(null)
    setSubscription(null)
    subscriptionCache.current = null
    localStorage.removeItem(CACHE_KEYS.SUBSCRIPTION)
  }

  return (
    <AuthContext.Provider value={{ user, subscription, authLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
