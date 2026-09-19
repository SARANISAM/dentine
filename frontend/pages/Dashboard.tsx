import PatientInfo from "../components/PatientInfo";

function Dashboard() {
    return (
        <main className="dashboard">
            <div className="page-header">
                <p className="label">CLINICAL WORKSPACE</p>
                <h1>Doctor Dashboard</h1>
                <p>John Mathew · PT-1024</p>
            </div>

            <PatientInfo />
        </main>
    );
}

export default Dashboard;



