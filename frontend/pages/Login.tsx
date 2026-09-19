import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./lib/supabase";

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
            setErrorMsg("Please enter your email and password.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (
                    error.message.toLowerCase().includes("email not confirmed") ||
                    error.message.toLowerCase().includes("email confirmation")
                ) {
                    setErrorMsg(
                        "Your email has not been confirmed yet. Please check your inbox and confirm your account before signing in."
                    );
                } else if (
                    error.message.toLowerCase().includes("invalid login credentials") ||
                    error.message.toLowerCase().includes("invalid email or password") ||
                    error.message.toLowerCase().includes("invalid credentials")
                ) {
                    setErrorMsg("Invalid email or password. Please try again.");
                } else {
                    setErrorMsg(error.message);
                }
                return;
            }

            if (data.session) {
                navigate("/dashboard");
            }
        } catch (err: any) {
            setErrorMsg(err?.message || "An unexpected error occurred. Please try again.");
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

                <form onSubmit={handleLogin}>
                    <label>Email</label>

                    <input
                        type="email"
                        placeholder="doctor@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />

                    <label>Password</label>

                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />

                    {errorMsg && (
                        <p className="auth-error-message">{errorMsg}</p>
                    )}

                    <button type="submit" className="primary-button" disabled={loading}>
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>

                <p className="auth-switch-text">
                    Don't have an account?{" "}
                    <Link to="/signup" className="auth-link">
                        Create account
                    </Link>
                </p>

                <p className="login-footer">
                    Clinical documentation assistant
                </p>
            </div>
        </div>
    );
}

export default Login;
