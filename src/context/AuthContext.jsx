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

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("email", email)
      .single()

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
  }

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
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
        setUser(null)
        setSubscription(null)
      } finally {
        // 🔑 GUARANTEE EXIT
        if (mounted) setAuthLoading(false)
      }
    }

    bootstrap()

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      try {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email)
        } else {
          setSubscription(null)
        }
      } finally {
        if (mounted) setAuthLoading(false)
      }
    })

    return () => {
      mounted = false
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
