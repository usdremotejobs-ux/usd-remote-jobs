import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Helper to get subscription based on email
  const fetchSubscription = async (email) => {
    if (!email) return null

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      if (error || !data) return null

      if (data.plan === "lifetime" && data.status === "active") {
        return data
      }

      const today = new Date()
      const expiry = new Date(data.expiry_date)

      if (data.status === "active" && expiry >= today) {
        return data
      }
      return null
    } catch (err) {
      console.error("Subscription fetch error:", err)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    // Only run this logic once on mount
    const initializeAuth = async () => {
      try {
        // 1. Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        
        let subData = null
        if (currentUser?.email) {
          subData = await fetchSubscription(currentUser.email)
        }

        if (mounted) {
          setUser(currentUser)
          setSubscription(subData)
        }
      } catch (error) {
        console.error("Auth init failed:", error)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    initializeAuth()

    // 2. Listen for changes (Sign in, Sign out, Auto-refresh token)
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        
        // Update user immediately so UI feels responsive
        if (mounted) setUser(currentUser)

        // Then fetch subscription if needed
        if (currentUser?.email) {
            const subData = await fetchSubscription(currentUser.email)
            if (mounted) setSubscription(subData)
        } else {
            if (mounted) setSubscription(null)
        }
        
        // Ensure loading is false after any auth event
        if (mounted) setAuthLoading(false)
      }
    )

    return () => {
      mounted = false
      authListener.unsubscribe()
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
