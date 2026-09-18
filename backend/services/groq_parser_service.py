from __future__ import annotations

import json
import os
import time
from typing import Any

from groq import Groq
from dotenv import load_dotenv
MODEL_NAME = "openai/gpt-oss-20b"
load_dotenv()


MODEL_NAME = "openai/gpt-oss-20b"


def _build_prompt(transcript: str) -> str:
    return f"""
You are a dental periodontal chart data extraction assistant.

Convert the dentist's transcript into exactly one valid JSON object.

Possible output formats:

UPDATE:
{{
  "action": "update",
  "tooth": 16,
  "pocket_depth": [3, 2, 4],
  "recession": [1, 0, 1],
  "bleeding": [true, false, true],
  "mobility": 0,
  "finding": null
}}

CORRECTION:
{{
  "action": "correction",
  "tooth": 16,
  "field_name": "pocket_depth",
  "corrected_value": "3 2 5",
  "reason": null
}}

NEEDS CONFIRMATION:
{{
  "action": "needs_confirmation",
  "reason": "The transcript is incomplete or unclear"
}}

Rules:

1. Return only one valid JSON object.

2. Do not return Markdown or explanations.

3. Do not guess missing values.

4. Use null for missing update fields.

5. Convert spoken tooth numbers into integers.

6. Pocket depth must contain exactly three values when provided.

7. Recession must contain exactly three values when provided.

8. Bleeding must always be represented as an array of exactly three Boolean values when updating a tooth.

9. The three bleeding values correspond to the three periodontal sites in the same order as pocket_depth and recession.

10. "Bleeding at site 1" means [true, false, false].

11. "Bleeding at site 2" means [false, true, false].

12. "Bleeding at site 3" means [false, false, true].

13. "Bleeding at sites 1 and 3" means [true, false, true].

14. "Bleeding at all three sites" means [true, true, true].

15. "No bleeding" means [false, false, false].

16. Do not guess a bleeding site if the transcript does not specify it.

17. If the dentist says words such as "no", "sorry", "correction", "I mean", "change", or "actually", treat the latest information as the correct one.

18. Ignore the incorrect value and keep only the final corrected value.

19. For a correction, use:
    - "field_name" for one of:
      "pocket_depth", "recession", "bleeding", "mobility", or "finding"
    - "corrected_value" as a string that can be parsed by the backend correction service.

20. Examples:

"Tooth 4 bleeding. No, tooth 5."
The final tooth is 5.

"Pocket depth 3 2 4. Sorry, 3 3 4."
The final pocket depth is [3, 3, 4].

"Mobility 2. Actually mobility 1."
The final mobility is 1.

Dentist transcript:
{transcript}
"""


def parse_transcript(transcript: str) -> dict[str, Any]:
    """
    Send a Whisper transcript to Groq and return the parsed clinical JSON.
    """

    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set.")

    if not transcript or not transcript.strip():
        raise ValueError("Whisper transcript cannot be empty.")

    client = Groq(api_key=api_key)

    prompt = _build_prompt(transcript.strip())

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a dental periodontal chart extraction assistant. "
                            "Return only one valid JSON object. "
                            "Do not use Markdown or explanations."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )

            result_text = response.choices[0].message.content

            if not result_text:
                raise RuntimeError("The Groq API returned an empty response.")

            return json.loads(result_text)

        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "The Groq API returned invalid JSON."
            ) from exc

        except Exception as error:
            error_text = str(error)

            if "404" in error_text or "model_not_found" in error_text:
                raise RuntimeError(
                    f"The selected Groq model is not available: {MODEL_NAME}"
                ) from error

            if attempt < 2:
                time.sleep(10)
            else:
                raise RuntimeError(
                    f"Groq API request failed: {error_text}"
                ) from error

    raise RuntimeError("Groq parser failed unexpectedly.")