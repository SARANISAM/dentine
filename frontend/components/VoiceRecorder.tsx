

import { useRef, useState } from "react";

interface VoiceRecorderProps {
    onRecordingComplete: (audio: Blob) => void;
}

function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState("");

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            setError("");

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
            setError(
                "Microphone permission was denied or the microphone is unavailable."
            );
        }
    };

    const stopRecording = () => {
        if (recorderRef.current) {
            recorderRef.current.stop();
            setRecording(false);
        }
    };

    return (
        <div className="recorder-card">
            <div className="microphone-icon">🎙</div>

            <h2>Voice Recording</h2>

            <p>
                {recording
                    ? "Listening to your measurement..."
                    : "Speak the periodontal measurement naturally."}
            </p>

            {recording && (
                <div className="recording-status">
                    <span className="recording-dot"></span>
                    Recording
                </div>
            )}

            {!recording ? (
                <button
                    onClick={startRecording}
                    className="primary-button record-button"
                >
                    Start Recording
                </button>
            ) : (
                <button
                    onClick={stopRecording}
                    className="stop-button"
                >
                    Stop Recording
                </button>
            )}

            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default VoiceRecorder;