import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const fetchSubscription = async (email) => {
    if (!email) {
      setSubscription(null)
      return
    }

    try {
      // ✅ ADD TIMEOUT TO SUBSCRIPTION FETCH
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Subscription fetch timeout')), 5000)
      )

      const fetchPromise = supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error || !data) {
        setSubscription(null)
        return
      }

      if (data.plan === "lifetime" && data.status === "active") {
        setSubscription(data)
        return
      }

      const today = new Date()
      const expiry = new Date(data.expiry_date)

      if (data.status === "active" && expiry >= today) {
        setSubscription(data)
      } else {
        setSubscription(null)
      }
    } catch (err) {
      console.error("Subscription fetch error:", err)
      setSubscription(null)
    }
  }

  useEffect(() => {
    let mounted = true
    let bootstrapTimeout = null

    const bootstrap = async () => {
      try {
        // ✅ ADD TIMEOUT FOR INITIAL SESSION CHECK
        bootstrapTimeout = setTimeout(() => {
          if (mounted && authLoading) {
            console.warn("Auth bootstrap timeout - forcing completion")
            setAuthLoading(false)
          }
        }, 5000)

        const { data } = await supabase.auth.getSession()
        if (!mounted) return

        const currentUser = data.session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email)
        } else {
          setSubscription(null)
        }
      } catch (err) {
        console.error("Auth bootstrap failed", err)
        if (mounted) {
          setUser(null)
          setSubscription(null)
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

        // For other events, update normally
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email)
        } else {
          setSubscription(null)
        }
      } catch (err) {
        console.error("Auth state change error:", err)
      } finally {
        if (mounted) setAuthLoading(false)
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
