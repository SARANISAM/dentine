import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PatientInfo from "../components/PatientInfo";
import VoiceRecorder from "../components/VoiceRecorder";
import TranscriptBox from "../components/TranscriptBox";
import AIInterpretation, { ParsedClinicalData } from "../components/AIInterpretation";
import { transcribeAudio, parseTranscript, applyClinicalData, ClinicalDataPayload } from "../services/api";

const CURRENT_EXAMINATION_ID = "58eb8a91-fd52-43b4-8bba-b6cde4f2442a";

function Dashboard() {
    const navigate = useNavigate();

    const [transcript, setTranscript] = useState("");
    const [statusState, setStatusState] = useState<"ready" | "recording" | "transcribing" | "processing_clinical" | "saving_clinical" | "saved_clinical" | "success" | "error">("ready");
    const [apiError, setApiError] = useState("");
    const [parsedResult, setParsedResult] = useState<ParsedClinicalData | null>(null);

    const handleRecordingComplete = async (audioBlob: Blob) => {
        setStatusState("transcribing");
        setApiError("");
        setTranscript("");
        setParsedResult(null);

        let recognizedText = "";

        // Step 1: Send audio to Whisper backend
        try {
            recognizedText = await transcribeAudio(audioBlob);
            setTranscript(recognizedText);
        } catch (err: any) {
            const errorMessage = err.message || "Unable to transcribe the recording.";
            setApiError(errorMessage);
            setStatusState("error");
            return;
        }

        // Step 2: Send transcript to Groq clinical parser
        setStatusState("processing_clinical");

        let groqParsed: ParsedClinicalData | null = null;
        try {
            const response = await parseTranscript(CURRENT_EXAMINATION_ID, recognizedText);
            if (response && response.parsed) {
                groqParsed = response.parsed;
            } else if (response) {
                groqParsed = response;
            } else {
                throw new Error("Unable to interpret the clinical transcript.");
            }
            setParsedResult(groqParsed);
        } catch (err: any) {
            const errorMessage = err.message || "Unable to interpret the clinical transcript.";
            setApiError(errorMessage);
            setStatusState("error");
            return;
        }

        // Step 3: Send mapped structured clinical data to FastAPI POST /api/clinical/apply
        setStatusState("saving_clinical");

        try {
            if (!groqParsed || groqParsed.tooth == null) {
                throw new Error("Parsed clinical data missing valid tooth number.");
            }

            const clinicalPayload: any = {
                action: (groqParsed.action === "update" || groqParsed.action === "record") ? groqParsed.action : "record",
                tooth: Number(groqParsed.tooth),
            };

            if (Array.isArray(groqParsed.pocket_depth) && groqParsed.pocket_depth.length === 3) {
                clinicalPayload.pocket_depth = groqParsed.pocket_depth.map(Number);
            }
            if (Array.isArray(groqParsed.recession) && groqParsed.recession.length === 3) {
                clinicalPayload.recession = groqParsed.recession.map(Number);
            }
            if (Array.isArray(groqParsed.bleeding) && groqParsed.bleeding.length === 3) {
                clinicalPayload.bleeding = groqParsed.bleeding.map(Boolean);
            }
            if (groqParsed.mobility != null && !isNaN(Number(groqParsed.mobility))) {
                clinicalPayload.mobility = Number(groqParsed.mobility);
            }

            if (groqParsed.finding && typeof groqParsed.finding === "string" && groqParsed.finding.trim() !== "") {
                clinicalPayload.finding = groqParsed.finding.trim();
            }

            await applyClinicalData({
                examination_id: CURRENT_EXAMINATION_ID,
                clinical_data: clinicalPayload,
                transcript: recognizedText,
            });


            setStatusState("saved_clinical");
        } catch (err: any) {
            const errorMessage = err.message || "Failed to save clinical measurement.";
            setApiError(errorMessage);
            setStatusState("error");
        }
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
                    statusState={statusState}
                    externalError={apiError}
                />

                <TranscriptBox
                    transcript={transcript}
                    isTranscribing={statusState === "transcribing"}
                    error={statusState === "error" ? apiError : undefined}
                />
            </div>

            <AIInterpretation
                parsedData={parsedResult}
                isProcessing={statusState === "processing_clinical"}
                isSaving={statusState === "saving_clinical"}
                isSaved={statusState === "saved_clinical"}
                error={statusState === "error" ? apiError : undefined}
                onConfirm={confirmMeasurement}
            />
        </main>
    );
}

export default Dashboard;



