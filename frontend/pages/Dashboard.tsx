import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PatientInfo from "../components/PatientInfo";
import VoiceRecorder from "../components/VoiceRecorder";
import TranscriptBox from "../components/TranscriptBox";
import AIInterpretation from "../components/AIInterpretation";

interface Measurement {
    tooth: number;
    pocket_depth: number[];
    bleeding: boolean;
}

function Dashboard() {
    const navigate = useNavigate();

    const [transcript, setTranscript] = useState("");
    const [measurement, setMeasurement] =
        useState<Measurement | null>(null);

    const handleRecordingComplete = (_audio: Blob) => {
        const mockTranscript =
            "Tooth sixteen, three two four, bleeding.";

        setTranscript(mockTranscript);

        setMeasurement({
            tooth: 16,
            pocket_depth: [3, 2, 4],
            bleeding: true,
        });
    };

    const confirmMeasurement = () => {
        navigate("/chart");
    };

    return (
        <main className="dashboard">
            <div className="page-header">
                <p className="label">CLINICAL WORKSPACE</p>

                <h1>Doctor Dashboard</h1>

                <p>
                    Record periodontal measurements using natural speech.
                </p>
            </div>

            <PatientInfo />

            <div className="voice-grid">
                <VoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                />

                <TranscriptBox transcript={transcript} />
            </div>

            <AIInterpretation
                measurement={measurement}
                onConfirm={confirmMeasurement}
            />
        </main>
    );
}

export default Dashboard;
