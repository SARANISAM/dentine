

import { useRef, useState } from "react";

interface VoiceRecorderProps {
    onRecordingComplete: (audio: Blob) => void;
    isTranscribing?: boolean;
    statusState?: "ready" | "recording" | "transcribing" | "processing_clinical" | "saving_clinical" | "saved_clinical" | "success" | "error";
    externalError?: string;
}

function VoiceRecorder({
    onRecordingComplete,
    isTranscribing = false,
    statusState,
    externalError,
}: VoiceRecorderProps) {
    const [recording, setRecording] = useState(false);
    const [micError, setMicError] = useState("");

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            setMicError("");

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setMicError("Microphone permission is required.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            const recorder = new MediaRecorder(stream);

            recorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, {
                    type: "audio/webm",
                });

                onRecordingComplete(audioBlob);

                stream.getTracks().forEach((track) => track.stop());
            };

            recorder.start();
            setRecording(true);
        } catch {
            setMicError("Microphone permission is required.");
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recording) {
            recorderRef.current.stop();
            setRecording(false);
        }
    };

    const currentError = micError || externalError;
    const isTranscribeBusy = isTranscribing || statusState === "transcribing";
    const isClinicalBusy = statusState === "processing_clinical";
    const isSavingBusy = statusState === "saving_clinical";
    const isBusy = isTranscribeBusy || isClinicalBusy || isSavingBusy;

    return (
        <div className="recorder-card">
            <div className="microphone-icon">
                {recording ? "🔴" : isBusy ? "⏳" : "🎙"}
            </div>

            <h2>Voice Recording</h2>

            <p>
                {recording
                    ? "Listening to your measurement..."
                    : isTranscribeBusy
                    ? "Transcribing audio..."
                    : isClinicalBusy
                    ? "Processing clinical data..."
                    : isSavingBusy
                    ? "Saving clinical measurement..."
                    : "Speak the periodontal measurement naturally."}
            </p>

            {recording && (
                <div className="recording-status">
                    <span className="recording-dot"></span>
                    🔴 Recording...
                </div>
            )}

            {isTranscribeBusy && !recording && (
                <div className="recording-status" style={{ color: "#d97706" }}>
                    ⏳ Transcribing audio...
                </div>
            )}

            {isClinicalBusy && !recording && (
                <div className="recording-status" style={{ color: "#d97706" }}>
                    ⏳ Processing clinical data...
                </div>
            )}

            {isSavingBusy && !recording && (
                <div className="recording-status" style={{ color: "#2563eb" }}>
                    ⏳ Saving clinical measurement...
                </div>
            )}

            {(statusState === "saved_clinical" || statusState === "success") && !recording && !isBusy && (
                <div className="recording-status" style={{ color: "#059669" }}>
                    ✓ Clinical measurement saved
                </div>
            )}

            {!recording ? (
                <button
                    onClick={startRecording}
                    disabled={isBusy}
                    className="primary-button record-button"
                >
                    {isTranscribeBusy
                        ? "⏳ Transcribing..."
                        : isClinicalBusy
                        ? "⏳ Parsing..."
                        : isSavingBusy
                        ? "⏳ Saving..."
                        : "🎙 Start Recording"}
                </button>
            ) : (
                <button
                    onClick={stopRecording}
                    className="stop-button"
                >
                    Stop Recording
                </button>
            )}

            {currentError && <p className="error-message">{currentError}</p>}
        </div>
    );
}

export default VoiceRecorder;

