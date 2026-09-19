import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../src/lib/supabase";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted) {
                setAuthenticated(!!session);
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                setAuthenticated(!!session);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "#75858b" }}>
                Verifying authentication...
            </div>
        );
    }

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
