import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./lib/supabase";

function SignUp() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (!email || !password || !confirmPassword) {
            setErrorMsg("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match. Please try again.");
            return;
        }

        if (password.length < 6) {
            setErrorMsg("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });

            if (error) {
                if (
                    error.message.toLowerCase().includes("already registered") ||
                    error.message.toLowerCase().includes("user already exists")
                ) {
                    setErrorMsg(
                        "This email is already registered. Please sign in instead."
                    );
                } else {
                    setErrorMsg(error.message);
                }
                return;
            }

            // If session is null, email confirmation is required
            if (!data.session) {
                setSuccessMsg(
                    "Account created! Please check your email and click the confirmation link to activate your account. Once confirmed, return here to sign in."
                );
                setEmail("");
                setPassword("");
                setConfirmPassword("");
            } else {
                // Email confirmation is disabled in Supabase — go straight to dashboard
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

                <h1>Create Account</h1>

                <p className="subtitle">
                    Join PerioVoice AI
                </p>

                {successMsg ? (
                    <div className="auth-success-message">
                        <p>{successMsg}</p>
                        <Link to="/login" className="auth-link auth-link-block">
                            Go to Sign In
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSignUp}>
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
                            placeholder="Create a password (min. 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />

                        <label>Confirm Password</label>

                        <input
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                        />

                        {errorMsg && (
                            <p className="auth-error-message">{errorMsg}</p>
                        )}

                        <button type="submit" className="primary-button" disabled={loading}>
                            {loading ? "Creating account…" : "Create Account"}
                        </button>
                    </form>
                )}

                <p className="auth-switch-text">
                    Already have an account?{" "}
                    <Link to="/login" className="auth-link">
                        Sign in
                    </Link>
                </p>

                <p className="login-footer">
                    Clinical documentation assistant
                </p>
            </div>
        </div>
    );
}

export default SignUp;
