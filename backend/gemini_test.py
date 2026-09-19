
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

Your task is to convert the dentist's spoken periodontal examination transcript
into exactly ONE valid JSON object.

IMPORTANT:
- Never guess missing values.
- Always extract a clearly spoken tooth number.
- An incomplete measurement is still a valid clinical update.
- Missing clinical information must be represented using null.
- Do not reject an update simply because some fields are missing.

NORMAL OUTPUT FORMAT:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": [3, 2, null],
  "recession": [1, null, null],
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

CORRECTION OUTPUT FORMAT:

{{
  "action": "correction",
  "tooth": 14,
  "target": "pocket_depth_3",
  "value": 5
}}

NEEDS CONFIRMATION OUTPUT FORMAT:

{{
  "action": "needs_confirmation",
  "reason": "Could not identify a valid tooth number from the transcript."
}}

RULES:

1. Return ONLY one valid JSON object.

2. Do not return Markdown.

3. Do not return explanations.

4. Do not return any text outside the JSON object.

5. Never guess a clinical value.

6. Never invent a tooth number.

7. Convert spoken tooth numbers into integers.

8. If a valid tooth number is clearly present anywhere in the transcript,
   extract that tooth number even if the clinical information is incomplete.

9. If a valid tooth number is present and at least one usable clinical
   measurement is provided, return:
   "action": "update"

10. Do NOT return "needs_confirmation" merely because some clinical
    measurements are missing.

11. Missing clinical fields must be represented as null.

--------------------------------------------------
TOOTH NUMBER
--------------------------------------------------

12. The tooth number must be an integer.

13. Examples:

    "Tooth fourteen"
    -> tooth = 14

    "Tooth 14"
    -> tooth = 14

    "Tooth one four"
    -> tooth = 14

14. If there is no identifiable valid tooth number anywhere in the transcript,
    return:

{{
  "action": "needs_confirmation",
  "reason": "Could not identify a valid tooth number from the transcript."
}}

--------------------------------------------------
POCKET DEPTH
--------------------------------------------------

15. Pocket depth has exactly three periodontal sites in this order:

    [MB, B, DB]

16. If three values are provided, return all three.

17. If two values are provided, return the two values followed by null.

18. If one value is provided, return that value followed by two null values.

19. Never invent missing pocket-depth values.

20. Examples:

    "Tooth 14. Pocket depth 3"

    return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": [3, null, null],
  "recession": null,
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

21. Example:

    "Tooth 14. Pocket depth 3 2"

    return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": [3, 2, null],
  "recession": null,
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

22. Example:

    "Tooth 14. Pocket depth 3 2 4"

    return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": [3, 2, 4],
  "recession": null,
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

--------------------------------------------------
RECESSION
--------------------------------------------------

23. Recession has exactly three periodontal sites in this order:

    [MB, B, DB]

24. If three values are provided, return all three.

25. If two values are provided, return the two values followed by null.

26. If one value is provided, return that value followed by two null values.

27. Never invent missing recession values.

28. Example:

    "Tooth 14. Recession 1"

    return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": null,
  "recession": [1, null, null],
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

29. Example:

    "Tooth 14. Recession 1 2"

    return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": null,
  "recession": [1, 2, null],
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

--------------------------------------------------
BLEEDING ON PROBING
--------------------------------------------------

30. Bleeding must be represented as an array of exactly three Boolean values
    when the dentist explicitly specifies bleeding.

31. The order is:

    [MB, B, DB]

32. "Bleeding at site 1" means:

    [true, false, false]

33. "Bleeding at site 2" means:

    [false, true, false]

34. "Bleeding at site 3" means:

    [false, false, true]

35. "Bleeding at sites 1 and 3" means:

    [true, false, true]

36. "Bleeding at all three sites" means:

    [true, true, true]

37. "No bleeding" means:

    [false, false, false]

38. "No bleeding at site 1" means:

    [false, null, null]

39. "No bleeding at site 2" means:

    [null, false, null]

40. "No bleeding at site 3" means:

    [null, null, false]

41. Do not assume bleeding is false simply because it was not mentioned.

42. If bleeding is not mentioned at all, return:

    "bleeding": null

43. Do not guess which bleeding site the dentist intended.

--------------------------------------------------
MOBILITY
--------------------------------------------------

44. Mobility should be returned as a number when explicitly provided.

45. If mobility is not mentioned, return:

    "mobility": null

46. Example:

    "Tooth 14. Mobility 2"

    return mobility = 2.

--------------------------------------------------
FINDING / DIAGNOSIS
--------------------------------------------------

47. Finding should be returned as a string when explicitly provided.

48. If finding is not mentioned, return:

    "finding": null

49. Never invent a diagnosis.

--------------------------------------------------
CORRECTIONS
--------------------------------------------------

50. The dentist may correct a previously spoken value.

51. Correction words include:

    "no"
    "sorry"
    "correction"
    "I mean"
    "change"
    "actually"

52. When a correction occurs, the latest value is the correct value.

53. Ignore the earlier incorrect value.

54. Example:

    "Tooth 4. No, tooth 5."

    The final tooth is 5.

55. Example:

    "Pocket depth 3 2 4. Sorry, 3 3 4."

    The final pocket depth is:

    [3, 3, 4]

56. Example:

    "Mobility 2. Actually mobility 1."

    The final mobility is:

    1

57. If the correction changes the tooth number, return:

{{
  "action": "correction",
  "tooth": corrected_tooth_number,
  "target": "tooth",
  "value": corrected_tooth_number
}}

58. If the correction changes a clinical field, return:

{{
  "action": "correction",
  "tooth": tooth_number,
  "target": "<field_name>",
  "value": corrected_value
}}

--------------------------------------------------
INCOMPLETE TRANSCRIPTS
--------------------------------------------------

59. An incomplete transcript is NOT automatically an invalid transcript.

60. Example:

    "Tooth 14. Pocket depth 3 2."

    MUST return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": [3, 2, null],
  "recession": null,
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

61. Example:

    "Tooth 14. Pocket depth 3."

    MUST return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": [3, null, null],
  "recession": null,
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

62. Example:

    "Tooth 14. Pocket depth 3 2. Recession 1."

    MUST return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": [3, 2, null],
  "recession": [1, null, null],
  "bleeding": null,
  "mobility": null,
  "finding": null
}}

63. Example:

    "Tooth 14. No bleeding."

    MUST return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": null,
  "recession": null,
  "bleeding": [false, false, false],
  "mobility": null,
  "finding": null
}}

64. Example:

    "Tooth 14. Mobility 1."

    MUST return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": null,
  "recession": null,
  "bleeding": null,
  "mobility": 1,
  "finding": null
}}

65. Example:

    "Tooth 14. Gingivitis."

    MUST return:

{{
  "action": "update",
  "tooth": 14,
  "pocket_depth": null,
  "recession": null,
  "bleeding": null,
  "mobility": null,
  "finding": "Gingivitis"
}}

--------------------------------------------------
FINAL OUTPUT STRUCTURE
--------------------------------------------------

66. For a normal update, ALWAYS use exactly these fields:

{{
  "action": "update",
  "tooth": <integer>,
  "pocket_depth": <array of 3 values or null>,
  "recession": <array of 3 values or null>,
  "bleeding": <array of 3 booleans/null values or null>,
  "mobility": <number or null>,
  "finding": <string or null>
}}

67. Do not add extra fields.

68. Do not remove required fields from the normal update structure.

69. Missing values must remain null.

70. Never guess missing periodontal values.

71. The frontend will use null values to identify which fields the dentist
    needs to complete manually.

72. If there is a valid tooth number and usable clinical information,
    ALWAYS return an "update".

73. Only return "needs_confirmation" when no valid tooth number can be
    identified.

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
                            "You are a dental periodontal chart extraction assistant. "
                            "Return only one valid JSON object. "
                            "Do not use Markdown. "
                            "Do not provide explanations. "
                            "Never guess missing values."
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
            error_text = str(error)

            print(f"\nAPI request failed: {error_text}")

            if "404" in error_text or "model_not_found" in error_text:
                print("\nThe selected Groq model is not available.")
                print(f"Current model: {MODEL_NAME}")
                print("Check the available models using your model-list script.")
                return

            if attempt < 2:
                print("Retrying in 10 seconds...")
                time.sleep(10)
            else:
                print("The API is temporarily unavailable.")
                print("Please try again later.")


if __name__ == "__main__":
    main()

