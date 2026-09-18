interface TranscriptBoxProps {
  transcript: string;
}

function TranscriptBox({ transcript }: TranscriptBoxProps) {
  return (
    <div className="transcript-card">
      <div className="section-heading">
        <div>
          <p className="label">VOICE INPUT</p>
          <h2>Live Transcript</h2>
        </div>

        {transcript && (
          <span className="status-badge">Received</span>
        )}
      </div>

      <p className="transcript-description">
        Speech recognized from the dentist
      </p>

      <div className="transcript-text">
        {transcript ||
          "Your spoken measurement will appear here..."}
      </div>
    </div>
  );
}

export default TranscriptBox;
