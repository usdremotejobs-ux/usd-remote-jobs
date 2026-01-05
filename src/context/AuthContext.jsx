import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // 🔑 STEP 1: Restore session on refresh
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return

      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    // 🔄 STEP 2: Listen to future auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        // IMPORTANT: INITIAL_SESSION fires on refresh
        if (event === "INITIAL_SESSION") {
          setUser(session?.user ?? null)
          setAuthLoading(false)
          return
        }

        if (event === "SIGNED_IN") {
          setUser(session?.user ?? null)
          setAuthLoading(false)
        }

        if (event === "SIGNED_OUT") {
          setUser(null)
          setSubscription(null)
          setAuthLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
