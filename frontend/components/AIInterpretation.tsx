export interface ParsedClinicalData {
    action?: string;
    tooth?: number;
    pocket_depth?: number[] | null;
    recession?: number[] | null;
    bleeding?: boolean[] | boolean | null;
    mobility?: number | null;
    finding?: string | null;
    [key: string]: any;
}

interface AIInterpretationProps {
    measurement?: ParsedClinicalData | null;
    parsedData?: ParsedClinicalData | null;
    isProcessing?: boolean;
    isSaving?: boolean;
    isSaved?: boolean;
    error?: string;
    onConfirm?: () => void;
}

function AIInterpretation({
    measurement,
    parsedData,
    isProcessing,
    isSaving,
    isSaved,
    error,
    onConfirm,
}: AIInterpretationProps) {
    const data = parsedData || measurement;

    if (!isProcessing && !isSaving && !isSaved && !error && !data) {
        return null;
    }

    return (
        <div className="interpretation-card" style={{ marginTop: "20px" }}>
            <div className="section-heading">
                <div>
                    <p className="label">GROQ CLINICAL PARSER</p>
                    <h2>Structured Clinical Data</h2>
                </div>

                {isProcessing || isSaving ? (
                    <span className="status-badge" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
                        ⏳ {isSaving ? "Saving..." : "Processing..."}
                    </span>
                ) : error ? (
                    <span className="status-badge" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                        Error
                    </span>
                ) : isSaved ? (
                    <span className="validated-badge" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
                        ✓ Saved to DB
                    </span>
                ) : (
                    <span className="validated-badge">
                        ✓ Parsed
                    </span>
                )}
            </div>

            <p className="transcript-description">
                Structured periodontal JSON produced by Groq clinical parser
            </p>

            {isProcessing && (
                <div style={{ padding: "12px", color: "#d97706", fontWeight: "500" }}>
                    ⏳ Processing clinical data with Groq...
                </div>
            )}

            {isSaving && (
                <div style={{ padding: "12px", color: "#2563eb", fontWeight: "500" }}>
                    ⏳ Saving clinical measurement to FastAPI backend...
                </div>
            )}

            {isSaved && (
                <div className="validation-message" style={{ margin: "12px 0" }}>
                    ✓ Clinical measurement recorded successfully
                </div>
            )}

            {error && (
                <div className="error-message" style={{ margin: "10px 0" }}>
                    {error}
                </div>
            )}

            {data && !isProcessing && (
                <>
                    <div className="measurement-grid" style={{ marginBottom: "15px" }}>
                        {data.tooth != null && (
                            <div className="measurement-item">
                                <span>Tooth</span>
                                <strong>{data.tooth}</strong>
                            </div>
                        )}

                        {Array.isArray(data.pocket_depth) && (
                            <div className="measurement-item">
                                <span>Pocket Depth</span>
                                <strong>{data.pocket_depth.join(" / ")} mm</strong>
                            </div>
                        )}

                        {Array.isArray(data.recession) && (
                            <div className="measurement-item">
                                <span>Recession</span>
                                <strong>{data.recession.join(" / ")} mm</strong>
                            </div>
                        )}

                        {data.bleeding != null && (
                            <div className="measurement-item">
                                <span>Bleeding</span>
                                <strong>
                                    {Array.isArray(data.bleeding)
                                        ? data.bleeding.map((b) => (b ? "Yes" : "No")).join(", ")
                                        : data.bleeding ? "Yes" : "No"}
                                </strong>
                            </div>
                        )}

                        {data.mobility != null && (
                            <div className="measurement-item">
                                <span>Mobility</span>
                                <strong>{data.mobility}</strong>
                            </div>
                        )}

                        {data.finding && (
                            <div className="measurement-item">
                                <span>Finding</span>
                                <strong>{data.finding}</strong>
                            </div>
                        )}
                    </div>

                    {/* Raw Structured JSON output for step-by-step verification */}
                    <div style={{ marginTop: "10px", marginBottom: "15px" }}>
                        <p style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563", marginBottom: "5px" }}>
                            Structured JSON Response:
                        </p>
                        <pre style={{
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "12px",
                            fontSize: "13px",
                            fontFamily: "monospace",
                            overflowX: "auto",
                            color: "#0f172a"
                        }}>
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </>
            )}

            {onConfirm && data && !isProcessing && !isSaving && (
                <button
                    onClick={onConfirm}
                    className="primary-button"
                >
                    Confirm & View Chart
                </button>
            )}
        </div>
    );
}

export default AIInterpretation;
