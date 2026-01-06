import { createContext, useContext, useEffect, useRef, useState } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

/**
 * Invariants this file guarantees:
 * 1. authLoading === false  → auth state is known
 * 2. subscriptionResolved === true → subscription is known (even if null)
 * 3. ProtectedRoute NEVER runs subscription checks before (2)
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)

  const [authLoading, setAuthLoading] = useState(true)
  const [subscriptionResolved, setSubscriptionResolved] = useState(false)

  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)

  // --------------------------------------------------
  // 🔹 Fetch subscription (single source of truth)
  // --------------------------------------------------
  const fetchSubscription = async (email) => {
    setSubscriptionResolved(false)

    if (!email) {
      setSubscription(null)
      setSubscriptionResolved(true)
      return
    }

    // prevent duplicate parallel calls
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      if (error || !data) {
        setSubscription(null)
        return
      }

      // ✅ Lifetime plan
      if (data.plan === "lifetime" && data.status === "active") {
        setSubscription(data)
        return
      }

      // ✅ Time-based plans
      const today = new Date()
      const expiry = new Date(data.expiry_date)

      if (data.status === "active" && expiry >= today) {
        setSubscription(data)
      } else {
        setSubscription(null)
      }
    } catch (err) {
      console.error("Subscription fetch failed:", err)
      setSubscription(null)
    } finally {
      fetchingRef.current = false
      setSubscriptionResolved(true)
    }
  }

  // --------------------------------------------------
  // 🔹 Bootstrap auth ONCE (refresh safe)
  // --------------------------------------------------
  useEffect(() => {
    mountedRef.current = true

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mountedRef.current) return

        const currentUser = data.session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email)
        } else {
          setSubscription(null)
          setSubscriptionResolved(true)
        }
      } catch (err) {
        console.error("Auth bootstrap failed:", err)
        setUser(null)
        setSubscription(null)
        setSubscriptionResolved(true)
      } finally {
        if (mountedRef.current) setAuthLoading(false)
      }
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        // SIGNED OUT → clear everything
        if (event === "SIGNED_OUT") {
          setUser(null)
          setSubscription(null)
          setSubscriptionResolved(true)
          return
        }

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser?.email) {
          await fetchSubscription(currentUser.email)
        } else {
          setSubscription(null)
          setSubscriptionResolved(true)
        }
      }
    )

    return () => {
      mountedRef.current = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // --------------------------------------------------
  // 🔹 Logout
  // --------------------------------------------------
  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSubscription(null)
    setSubscriptionResolved(true)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        authLoading,
        subscriptionResolved,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
