interface Measurement {
    tooth: number;
    pocket_depth: number[];
    bleeding: boolean;
}

interface AIInterpretationProps {
    measurement: Measurement | null;
    onConfirm: () => void;
}

function AIInterpretation({
    measurement,
    onConfirm,
}: AIInterpretationProps) {
    if (!measurement) {
        return null;
    }

    return (
        <div className="interpretation-card">
            <div className="section-heading">
                <div>
                    <p className="label">AI ANALYSIS</p>
                    <h2>AI Interpretation</h2>
                </div>

                <span className="validated-badge">
                    ✓ Validated
                </span>
            </div>

            <p className="transcript-description">
                Structured data extracted from the voice entry
            </p>

            <div className="measurement-grid">
                <div className="measurement-item">
                    <span>Tooth</span>
                    <strong>{measurement.tooth}</strong>
                </div>

                <div className="measurement-item">
                    <span>Mesial</span>
                    <strong>{measurement.pocket_depth[0]} mm</strong>
                </div>

                <div className="measurement-item">
                    <span>Middle</span>
                    <strong>{measurement.pocket_depth[1]} mm</strong>
                </div>

                <div className="measurement-item">
                    <span>Distal</span>
                    <strong>{measurement.pocket_depth[2]} mm</strong>
                </div>

                <div className="measurement-item">
                    <span>Bleeding</span>
                    <strong>
                        {measurement.bleeding ? "Yes" : "No"}
                    </strong>
                </div>
            </div>

            <div className="validation-message">
                ✓ Measurement validated successfully
            </div>

            <button
                onClick={onConfirm}
                className="primary-button"
            >
                Confirm & Add to Chart
            </button>
        </div>
    );
}

export default AIInterpretation;
