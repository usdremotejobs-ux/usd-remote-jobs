import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    // =====================================================
    // 🔹 INITIAL SESSION LOAD (MAGIC LINK SAFE)
    // =====================================================
    useEffect(() => {
        const init = async () => {
            setLoading(true);

            const {
                data: { session },
            } = await supabase.auth.getSession();

            const currentUser = session?.user || null;
            setUser(currentUser);

            if (currentUser?.email) {
                await fetchSubscription(currentUser.email);
            } else {
                setSubscription(null);
            }

            setLoading(false);
        };

        init();

        // =====================================================
        // 🔹 AUTH STATE CHANGES (LOGIN / LOGOUT)
        // =====================================================
        const {
            data: { subscription: authListener },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setLoading(true);

            const currentUser = session?.user || null;
            setUser(currentUser);

            if (currentUser?.email) {
                await fetchSubscription(currentUser.email);
            } else {
                setSubscription(null);
            }

            setLoading(false);
        });

        return () => {
            authListener.unsubscribe();
        };
    }, []);

    // =====================================================
    // 🔹 FETCH SUBSCRIPTION (LIFETIME SAFE)
    // =====================================================
    const fetchSubscription = async (email) => {
        const { data, error } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("email", email)
            .single();

        if (error || !data) {
            console.warn("No subscription found");
            setSubscription(null);
            return;
        }

        // Lifetime plan → expiry_date = null
        if (data.status === "active" && !data.expiry_date) {
            setSubscription(data);
            return;
        }

        // Monthly / Quarterly
        const today = new Date();
        const expiry = new Date(data.expiry_date);

        if (data.status === "active" && expiry >= today) {
            setSubscription(data);
        } else {
            setSubscription(null);
        }
    };

    // =====================================================
    // 🔹 LOGOUT
    // =====================================================
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSubscription(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                subscription,
                loading,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
