import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Helper to safely fetch subscription
  const fetchSubscription = async (email) => {
    if (!email) return null

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      if (error || !data) return null

      // Check for lifetime plan
      if (data.plan === "lifetime" && data.status === "active") {
        return data
      }

      // Check dates
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

    // 1. Initialize Auth State
    const initializeAuth = async () => {
      try {
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
        // 🔑 GUARANTEE EXIT - ensures app never gets stuck loading
        if (mounted) setAuthLoading(false)
      }
    }

    initializeAuth()

    // 2. Listen for Auto-Refresh / Tab Switches
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        
        // Update user immediately for speed
        if (mounted) setUser(currentUser)

        // Then verify subscription
        if (currentUser?.email) {
            const subData = await fetchSubscription(currentUser.email)
            if (mounted) setSubscription(subData)
        } else {
            if (mounted) setSubscription(null)
        }
        
        // Always ensure loading stops after an event
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
    <AuthContext.Provider value={{ user, subscription, authLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
