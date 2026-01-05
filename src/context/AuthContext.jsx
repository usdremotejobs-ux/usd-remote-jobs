import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // =====================================================
  // 🔹 FETCH SUBSCRIPTION (LIFETIME SAFE)
  // =====================================================
  const fetchSubscription = async (email) => {
    if (!email) {
      setSubscription(null)
      return
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("email", email)
      .single()

    if (error || !data) {
      setSubscription(null)
      return
    }

    // Lifetime plan
    if (data.plan === "lifetime" && data.status === "active") {
      setSubscription(data)
      return
    }

    // Time-based plans
    const today = new Date()
    const expiry = new Date(data.expiry_date)

    if (data.status === "active" && expiry >= today) {
      setSubscription(data)
    } else {
      setSubscription(null)
    }
  }

  // =====================================================
  // 🔹 AUTH BOOTSTRAP + LISTENER (REFRESH SAFE)
  // =====================================================
  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser?.email) {
        await fetchSubscription(currentUser.email)
      } else {
        setSubscription(null)
      }

      setAuthLoading(false)
    }

    bootstrap()

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser?.email) {
        await fetchSubscription(currentUser.email)
      } else {
        setSubscription(null)
      }

      setAuthLoading(false)
    })

    return () => {
      mounted = false
      authSubscription.unsubscribe()
    }
  }, [])

  // =====================================================
  // 🔹 LOGOUT
  // =====================================================
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
