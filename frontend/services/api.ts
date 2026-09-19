const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const WHISPER_BASE_URL = import.meta.env.VITE_WHISPER_BASE_URL || "";

export interface ClinicalDataPayload {
    action: string;
    tooth: number;
    pocket_depth?: (number | null)[] | null;
    recession?: (number | null)[] | null;
    bleeding?: (boolean | null)[] | null;
    mobility?: number | null;
    finding?: string | null;
}

export interface ApplyClinicalDataRequest {
    examination_id: string;
    clinical_data: ClinicalDataPayload;
    transcript?: string | null;
}


export async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const endpoint = `${WHISPER_BASE_URL}/api/transcribe`;

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            body: formData,
        });
    } catch {
        throw new Error("Backend server unavailable.");
    }

    if (!response.ok) {
        let errorMessage = "Unable to transcribe the recording.";
        try {
            const errorData = await response.json();
            if (errorData?.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // fallback error message
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error);
    }

    if (typeof data.transcript === "string") {
        return data.transcript;
    }

    throw new Error("Unable to transcribe the recording.");
}

export async function parseTranscript(examinationId: string, transcript: string) {
    const url = `${API_BASE_URL}/api/clinical/parse-transcript?examination_id=${encodeURIComponent(examinationId)}&transcript=${encodeURIComponent(transcript)}`;

    let response: Response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch {
        throw new Error("Backend server unavailable.");
    }

    if (!response.ok) {
        let errorMessage = "Unable to interpret the clinical transcript.";
        try {
            const errorData = await response.json();
            if (errorData?.detail) {
                errorMessage =
                    typeof errorData.detail === "string"
                        ? errorData.detail
                        : JSON.stringify(errorData.detail);
            }
        } catch {
            // fallback error message
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}

export async function applyClinicalData(payload: ApplyClinicalDataRequest) {
    const response = await fetch(`${API_BASE_URL}/api/clinical/apply`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        try {
            const errorData = await response.json();
            if (errorData?.detail) {
                errorMessage =
                    typeof errorData.detail === "string"
                        ? errorData.detail
                        : JSON.stringify(errorData.detail);
            }
        } catch {
            // Use default error message if JSON parsing fails
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}


