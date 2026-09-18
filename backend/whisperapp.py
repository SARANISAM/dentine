from flask import Flask, send_from_directory, request, jsonify
from faster_whisper import WhisperModel
import os

app = Flask(__name__)

frontend_folder = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../frontend")
)

# Load Whisper model
model = WhisperModel("base", device="cpu", compute_type="int8")


@app.route("/")
def home():
    return send_from_directory(frontend_folder, "whisperindex.html")


@app.route("/api/health")
def health():
    return {"status": "ok"}


@app.route("/api/transcribe", methods=["POST"])
def transcribe():

    if "audio" not in request.files:
        return jsonify({"error": "No audio file received"}), 400

    audio_file = request.files["audio"]

    try:
        # Save uploaded audio temporarily
        audio_path = os.path.join(frontend_folder, "temp_audio.webm")
        audio_file.save(audio_path)

        # Transcribe using local Whisper
        segments, info = model.transcribe(
    audio_path,
    initial_prompt="Dental examination. Tooth numbers. Probing depths. Bleeding. Mobility. Plaque. Calculus.",
    temperature=0,
    condition_on_previous_text=False,
    vad_filter=True
)

        transcript = " ".join(
            segment.text for segment in segments
        )

        # Delete temporary audio
        os.remove(audio_path)

        return jsonify({
            "transcript": transcript.strip()
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)