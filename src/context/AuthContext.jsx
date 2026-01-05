import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  // ✅ Cache subscription to preserve it during timeouts
  const subscriptionCache = useRef(null)

  const fetchSubscription = async (email) => {
    if (!email) {
      setSubscription(null)
      subscriptionCache.current = null
      return
    }

    try {
      // ✅ ADD TIMEOUT TO SUBSCRIPTION FETCH
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Subscription fetch timeout')), 8000)
      )

      const fetchPromise = supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      // ✅ Only clear subscription on real errors, not timeout
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found, which means no subscription
        console.error("Subscription fetch error:", error)
        // Keep cached subscription on network errors
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

    } catch (err) {
      console.error("Subscription fetch error:", err)
      
      // ✅ On timeout, keep cached subscription
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
        // ✅ INCREASED TIMEOUT FOR INITIAL SESSION CHECK
        bootstrapTimeout = setTimeout(() => {
          if (mounted && authLoading) {
            console.warn("Auth bootstrap timeout - forcing completion")
            setAuthLoading(false)
          }
        }, 8000)

        const { data } = await supabase.auth.getSession()
        if (!mounted) return

        const currentUser = data.session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email)
        } else {
          setSubscription(null)
          subscriptionCache.current = null
        }
      } catch (err) {
        console.error("Auth bootstrap failed", err)
        if (mounted) {
          setUser(null)
          // Don't clear subscription cache on bootstrap errors
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
        // ✅ HANDLE TOKEN REFRESH WITHOUT FULL LOADING STATE
        if (event === 'TOKEN_REFRESHED') {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          
          if (currentUser?.email) {
            await fetchSubscription(currentUser.email)
          }
          return
        }

        // ✅ HANDLE SIGN OUT
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSubscription(null)
          subscriptionCache.current = null
          return
        }

        // For other events, update normally
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email)
        } else {
          setSubscription(null)
          subscriptionCache.current = null
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
