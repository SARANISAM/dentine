interface TranscriptBoxProps {
  transcript: string;
  isTranscribing?: boolean;
  error?: string;
}

function TranscriptBox({ transcript, isTranscribing, error }: TranscriptBoxProps) {
  return (
    <div className="transcript-card">
      <div className="section-heading">
        <div>
          <p className="label">VOICE INPUT</p>
          <h2>Live Transcript</h2>
        </div>

        {isTranscribing ? (
          <span className="status-badge" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
            Transcribing...
          </span>
        ) : error ? (
          <span className="status-badge" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
            Error
          </span>
        ) : transcript ? (
          <span className="status-badge">Received</span>
        ) : (
          <span className="status-badge" style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>
            Ready
          </span>
        )}
      </div>

      <p className="transcript-description">
        Speech recognized from the dentist
      </p>

      {error ? (
        <div className="transcript-text" style={{ color: "#dc2626" }}>
          {error}
        </div>
      ) : (
        <div className="transcript-text">
          {isTranscribing
            ? "⏳ Transcribing audio..."
            : transcript || "Your spoken measurement will appear here..."}
        </div>
      )}
    </div>
  );
}

export default TranscriptBox;

