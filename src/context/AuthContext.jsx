import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  const mountedRef = useRef(true)

  const fetchSubscription = async (email) => {
    if (!email) return null
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("email", email)
        .single()

      if (error || !data) return null

      if (data.plan === "lifetime" && data.status === "active") return data

      // Date Logic: Ignore time of day
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(data.expiry_date)
      expiry.setHours(0, 0, 0, 0)

      if (data.status === "active" && expiry >= today) return data
      return null
    } catch (err) {
      console.error(err)
      return null
    }
  }

  useEffect(() => {
    mountedRef.current = true

    const initializeAuth = async () => {
      try {
        // 1. Check for Magic Link Token in URL
        // If this exists, Supabase is still working. We MUST NOT turn off loading yet.
        const isMagicLink = window.location.hash.includes('access_token') 
                            || window.location.search.includes('code=');

        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        
        let subData = null
        if (currentUser?.email) {
          subData = await fetchSubscription(currentUser.email)
        }

        if (mountedRef.current) {
          setUser(currentUser)
          if (subData || !currentUser) setSubscription(subData)
        }

        // 🟢 THE FIX: 
        // Only stop loading if we are NOT waiting for a magic link to resolve.
        // If it IS a magic link, the onAuthStateChange listener below will handle the unlock.
        if (mountedRef.current && !isMagicLink) {
            setAuthLoading(false)
        }

      } catch (error) {
        console.error("Auth init failed:", error)
        if (mountedRef.current) setAuthLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
           setUser(null)
           setSubscription(null)
           if (mountedRef.current) setAuthLoading(false)
           return
        }

        const currentUser = session?.user ?? null
        if (mountedRef.current) setUser(currentUser)

        if (currentUser?.email) {
            const subData = await fetchSubscription(currentUser.email)
            if (mountedRef.current) {
                if (subData) setSubscription(subData)
                else if (event === 'INITIAL_SESSION') setSubscription(null)
            }
        }
        
        // Always unlock loading here. This catches the moment the Magic Link finishes.
        if (mountedRef.current) setAuthLoading(false)
      }
    )

    return () => {
      mountedRef.current = false
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
