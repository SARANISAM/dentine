import os
import json
import time
from groq import Groq


MODEL_NAME = "openai/gpt-oss-20b"


def main():
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        print("GROQ_API_KEY is not set.")
        return

    client = Groq(api_key=api_key)

    examination_id = input("Enter examination ID: ").strip()
    transcript = input("Enter Whisper transcript: ").strip()

    if not examination_id:
        print("Examination ID cannot be empty.")
        return

    if not transcript:
        print("Whisper transcript cannot be empty.")
        return

    prompt = f"""
You are a dental periodontal chart data extraction assistant.

Convert the dentist's transcript into exactly one valid JSON object.

Possible output formats:

UPDATE:
{{
  "action": "update",
  "tooth": 16,
  "pocket_depth": [3, 2, 4],
  "recession": [1, 0, 1],
  "bleeding": true,
  "mobility": 0,
  "finding": null
}}

CORRECTION:
{{
  "action": "correction",
  "tooth": 16,
  "target": "pocket_depth_3",
  "value": 5
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

19. If the correction changes the tooth number, return:
{
  "action": "correction",
  "tooth": corrected_tooth_number,
  "target": "<field_name>",
  "value": <corrected_value>
}

20. Examples:
"Tooth 4 bleeding. No, tooth 5."
→ tooth = 5

"Pocket depth 3 2 4. Sorry, 3 3 4."
→ pocket_depth = [3,3,4]

"Mobility 2. Actually mobility 1."
→ mobility = 1
Dentist transcript:
{transcript}
"""

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Return only valid JSON. "
                            "Do not use Markdown or explanations."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0,
                response_format={"type": "json_object"}
            )

            result_text = response.choices[0].message.content

            if not result_text:
                print("The API returned an empty response.")
                return

            clinical_data = json.loads(result_text)

            final_json = {
                "examination_id": examination_id,
                "clinical_data": clinical_data,
                "transcript": transcript
            }

            print("\nFinal JSON:")
            print(json.dumps(final_json, indent=2))
            return

        except json.JSONDecodeError:
            print("The API returned invalid JSON.")
            return

        except Exception as error:
            print(f"\nAPI request failed: {error}")

            if attempt < 2:
                print("Retrying in 10 seconds...")
                time.sleep(10)
            else:
                print("The API is temporarily unavailable.")
                print("Please try again later.")


if __name__ == "__main__":
    main()