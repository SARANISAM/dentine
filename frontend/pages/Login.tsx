import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../src/lib/supabase";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        if (!email || !password) {
            setErrorMsg("Please enter email and password.");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.toLowerCase().includes("invalid login credentials")) {
                    setErrorMsg("Invalid login credentials. Please check your email and password.");
                } else if (error.message.toLowerCase().includes("email not confirmed")) {
                    setErrorMsg("Email confirmation required. Please check your inbox and confirm your account.");
                } else {
                    setErrorMsg(error.message);
                }
                return;
            }

            if (data?.session) {
                navigate("/dashboard");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred during sign in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="logo-circle">P</div>

                <h1>PerioVoice AI</h1>

                <p className="subtitle">
                    Voice-first clinical measurement
                </p>

                {errorMsg && (
                    <div style={{
                        backgroundColor: "#fef2f2",
                        color: "#b94a48",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        marginBottom: "18px",
                        border: "1px solid #fecaca"
                    }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <label>Email</label>

                    <input
                        type="email"
                        placeholder="doctor@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label>Password</label>

                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" className="primary-button" disabled={loading}>
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#52636b" }}>
                    Don't have an account?{" "}
                    <Link to="/signup" style={{ color: "#0e6670", fontWeight: "600", textDecoration: "none" }}>
                        Sign Up
                    </Link>
                </div>

                <p className="login-footer">
                    Clinical documentation assistant
                </p>
            </div>
        </div>
    );
}

export default Login;
