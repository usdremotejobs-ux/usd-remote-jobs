import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const setupAuth = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const currentUser = session?.user || null;
            setUser(currentUser);

            if (currentUser?.email) {
                await fetchSubscription(currentUser.email);
            }

            setLoading(false);
        };

        setupAuth();

        const {
            data: { subscription: authListener },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user || null;
            setUser(currentUser);

            if (currentUser?.email) {
                fetchSubscription(currentUser.email);
            } else {
                setSubscription(null);
            }
        });

        return () => {
            authListener.unsubscribe();
        };
    }, []);

    const fetchSubscription = async (email) => {
        const { data, error } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("email", email)
            .single();

        if (error || !data) {
            console.error("Subscription fetch failed:", error);
            setSubscription(null);
            return;
        }

        const today = new Date();
        const expiry = new Date(data.expiry_date);

        if (data.status === "active" && expiry >= today) {
            setSubscription(data);
        } else {
            setSubscription(null);
        }
    };

    // ✅ ✅ ADD THIS LOGOUT FUNCTION
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
                logout, // ✅ EXPORT LOGOUT HERE
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
