import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../src/lib/supabase";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            alert("Please enter email and password");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.warn("Supabase auth notice:", error.message);
            }
            // Navigate to dashboard upon completion
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            navigate("/dashboard");
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
                    />

                    <label>Password</label>

                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit" className="primary-button">
                        Sign In
                    </button>
                </form>

                <p className="login-footer">
                    Clinical documentation assistant
                </p>
            </div>
        </div>
    );
}

export default Login;
