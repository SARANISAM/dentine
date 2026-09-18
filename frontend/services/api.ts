const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface ClinicalDataPayload {
    action: string;
    tooth: number;
    pocket_depth: number[];
    recession: number[];
    bleeding: boolean[];
    mobility: number;
    finding?: string | null;
}

export interface ApplyClinicalDataRequest {
    examination_id: string;
    clinical_data: ClinicalDataPayload;
    transcript?: string | null;
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
