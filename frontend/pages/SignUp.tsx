import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../src/lib/supabase";

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
            setErrorMsg("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setErrorMsg("Password should be at least 6 characters long.");
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
                if (error.message.toLowerCase().includes("already registered")) {
                    setErrorMsg("This email is already registered. Please sign in instead.");
                } else {
                    setErrorMsg(error.message);
                }
                return;
            }

            if (data?.user) {
                if (data.session === null) {
                    setSuccessMsg("Registration successful! Please check your email inbox to confirm your account before logging in.");
                } else {
                    // Auto logged in (if email confirmation is disabled on Supabase project)
                    navigate("/dashboard");
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred during sign up.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="logo-circle">P</div>

                <h1>Doctor Registration</h1>

                <p className="subtitle">
                    Create an account to access PerioVoice AI
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

                {successMsg && (
                    <div style={{
                        backgroundColor: "#f0fdf4",
                        color: "#166534",
                        padding: "15px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        marginBottom: "18px",
                        border: "1px solid #bbf7d0",
                        lineHeight: "1.5"
                    }}>
                        ✓ {successMsg}
                    </div>
                )}

                {!successMsg ? (
                    <form onSubmit={handleSignUp}>
                        <label>Doctor Email</label>
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
                            placeholder="Enter password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <label>Confirm Password</label>
                        <input
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <button type="submit" className="primary-button" disabled={loading}>
                            {loading ? "Signing Up..." : "Sign Up"}
                        </button>
                    </form>
                ) : (
                    <div style={{ textAlign: "center", marginTop: "10px" }}>
                        <Link to="/login" className="primary-button" style={{ display: "inline-block", textDecoration: "none" }}>
                            Go to Sign In
                        </Link>
                    </div>
                )}

                <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#52636b" }}>
                    Already have an account?{" "}
                    <Link to="/login" style={{ color: "#0e6670", fontWeight: "600", textDecoration: "none" }}>
                        Sign In
                    </Link>
                </div>

                <p className="login-footer">
                    Clinical documentation assistant
                </p>
            </div>
        </div>
    );
}

export default SignUp;
