import { Link, useNavigate } from "react-router-dom";

function Navbar() {
    const navigate = useNavigate();

    const logout = () => {
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <Link to="/dashboard" className="brand">
                <span className="brand-icon">P</span>
                PerioVoice AI
            </Link>

            <div className="nav-links">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/chart">Periodontal Chart</Link>

                <button onClick={logout} className="logout-button">
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;
