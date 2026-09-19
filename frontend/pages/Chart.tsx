
import { useState, useEffect } from "react";
import VoiceRecorder from "../components/VoiceRecorder";
import TranscriptBox from "../components/TranscriptBox";
import AIInterpretation, {
    ParsedClinicalData,
} from "../components/AIInterpretation";
import {
    transcribeAudio,
    parseTranscript,
    applyClinicalData,
} from "../services/api";

const CURRENT_EXAMINATION_ID =
    "58eb8a91-fd52-43b4-8bba-b6cde4f2442a";

interface Tooth {
    tooth: number;
    tooth_number?: number;

    mesial: number;
    middle: number;
    distal: number;

    pocket_1?: number;
    pocket_2?: number;
    pocket_3?: number;

    recession_1?: number;
    recession_2?: number;
    recession_3?: number;

    bleeding: boolean;
    bleeding_1?: boolean;
    bleeding_2?: boolean;
    bleeding_3?: boolean;

    mobility?: number;
    finding?: string;
}

const initialTeeth: Tooth[] = [
    {
        tooth: 16,
        tooth_number: 16,
        mesial: 3,
        middle: 2,
        distal: 4,
        bleeding: true,
        bleeding_1: true,
        bleeding_2: false,
        bleeding_3: false,
    },
    {
        tooth: 11,
        tooth_number: 11,
        mesial: 2,
        middle: 2,
        distal: 3,
        bleeding: false,
        bleeding_1: false,
        bleeding_2: false,
        bleeding_3: false,
    },
    {
        tooth: 26,
        tooth_number: 26,
        mesial: 4,
        middle: 3,
        distal: 4,
        bleeding: true,
        bleeding_1: true,
        bleeding_2: false,
        bleeding_3: true,
    },
    {
        tooth: 36,
        tooth_number: 36,
        mesial: 3,
        middle: 3,
        distal: 3,
        bleeding: false,
        bleeding_1: false,
        bleeding_2: false,
        bleeding_3: false,
    },
    {
        tooth: 46,
        tooth_number: 46,
        mesial: 2,
        middle: 2,
        distal: 2,
        bleeding: false,
        bleeding_1: false,
        bleeding_2: false,
        bleeding_3: false,
    },
];

interface FormData {
    tooth_number: string;

    pocket_1: string;
    pocket_2: string;
    pocket_3: string;

    recession_1: string;
    recession_2: string;
    recession_3: string;

    bleeding_1: boolean;
    bleeding_2: boolean;
    bleeding_3: boolean;

    mobility: string;
    finding: string;
}

interface MissingFields {
    pocket_depth: string[];
    recession: string[];
    bleeding?: boolean;
    mobility?: boolean;
    finding?: boolean;
}

const initialFormData: FormData = {
    tooth_number: "",

    pocket_1: "",
    pocket_2: "",
    pocket_3: "",

    recession_1: "",
    recession_2: "",
    recession_3: "",

    bleeding_1: false,
    bleeding_2: false,
    bleeding_3: false,

    mobility: "",
    finding: "",
};

/*
 * Find which values are missing from the AI response.
 *
 * IMPORTANT:
 * - [false, false, false] bleeding is VALID.
 * - bleeding === null means the dentist did not mention bleeding.
 */
const identifyMissingFields = (
    parsedData: ParsedClinicalData
): MissingFields | null => {
    if (!parsedData) return null;

    const missing: MissingFields = {
        pocket_depth: [],
        recession: [],
    };

    // -----------------------------
    // Pocket depth
    // -----------------------------
    if (Array.isArray(parsedData.pocket_depth)) {
        if (
            parsedData.pocket_depth.length < 1 ||
            parsedData.pocket_depth[0] == null
        ) {
            missing.pocket_depth.push("mesial");
        }

        if (
            parsedData.pocket_depth.length < 2 ||
            parsedData.pocket_depth[1] == null
        ) {
            missing.pocket_depth.push("middle");
        }

        if (
            parsedData.pocket_depth.length < 3 ||
            parsedData.pocket_depth[2] == null
        ) {
            missing.pocket_depth.push("distal");
        }
    } else {
        missing.pocket_depth = ["mesial", "middle", "distal"];
    }

    // -----------------------------
    // Recession
    // -----------------------------
    if (Array.isArray(parsedData.recession)) {
        if (
            parsedData.recession.length < 1 ||
            parsedData.recession[0] == null
        ) {
            missing.recession.push("mesial");
        }

        if (
            parsedData.recession.length < 2 ||
            parsedData.recession[1] == null
        ) {
            missing.recession.push("middle");
        }

        if (
            parsedData.recession.length < 3 ||
            parsedData.recession[2] == null
        ) {
            missing.recession.push("distal");
        }
    } else {
        missing.recession = ["mesial", "middle", "distal"];
    }

    // -----------------------------
    // Bleeding
    // -----------------------------
    // null = not mentioned = missing
    //
    // [false,false,false] = explicitly
    // "No bleeding" = VALID
    if (!Array.isArray(parsedData.bleeding)) {
        missing.bleeding = true;
    } else if (parsedData.bleeding.length !== 3) {
        missing.bleeding = true;
    }

    // -----------------------------
    // Mobility
    // -----------------------------
    if (
        parsedData.mobility === null ||
        parsedData.mobility === undefined
    ) {
        missing.mobility = true;
    }

    // -----------------------------
    // Finding
    // -----------------------------
    if (
        !parsedData.finding ||
        typeof parsedData.finding !== "string" ||
        parsedData.finding.trim() === ""
    ) {
        missing.finding = true;
    }

    const hasMissing =
        missing.pocket_depth.length > 0 ||
        missing.recession.length > 0 ||
        missing.bleeding === true ||
        missing.mobility === true ||
        missing.finding === true;

    return hasMissing ? missing : null;
};

function Chart() {
    const [toothData, setToothData] =
        useState<Tooth[]>(initialTeeth);

    const [isLoading] = useState(false);

    const [formData, setFormData] =
        useState<FormData>(initialFormData);

    const [validationError, setValidationError] = useState("");
    const [manualApiError, setManualApiError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // -----------------------------
    // Voice state
    // -----------------------------
    const [transcript, setTranscript] = useState("");
    const [voiceStatus, setVoiceStatus] = useState<
        | "ready"
        | "recording"
        | "transcribing"
        | "processing_clinical"
        | "saving_clinical"
        | "saved_clinical"
        | "error"
    >("ready");

    const [voiceApiError, setVoiceApiError] = useState("");

    const [parsedResult, setParsedResult] =
        useState<ParsedClinicalData | null>(null);

    const [missingFields, setMissingFields] =
        useState<MissingFields | null>(null);

    const [showMissingFieldsAlert, setShowMissingFieldsAlert] =
        useState(false);

    /*
     * When Groq returns data, put it into the manual form.
     *
     * DO NOT save to backend here.
     *
     * Example:
     * pocket_depth: [3,2,null]
     *
     * becomes:
     * pocket_1 = "3"
     * pocket_2 = "2"
     * pocket_3 = ""
     *
     * The dentist can now fill pocket_3 manually.
     */
    useEffect(() => {
        if (!parsedResult) return;

        if (parsedResult.tooth != null) {
            setFormData((prev) => ({
                ...prev,

                tooth_number: String(parsedResult.tooth),

                pocket_1:
                    Array.isArray(parsedResult.pocket_depth) &&
                    parsedResult.pocket_depth[0] != null
                        ? String(parsedResult.pocket_depth[0])
                        : "",

                pocket_2:
                    Array.isArray(parsedResult.pocket_depth) &&
                    parsedResult.pocket_depth[1] != null
                        ? String(parsedResult.pocket_depth[1])
                        : "",

                pocket_3:
                    Array.isArray(parsedResult.pocket_depth) &&
                    parsedResult.pocket_depth[2] != null
                        ? String(parsedResult.pocket_depth[2])
                        : "",

                recession_1:
                    Array.isArray(parsedResult.recession) &&
                    parsedResult.recession[0] != null
                        ? String(parsedResult.recession[0])
                        : "",

                recession_2:
                    Array.isArray(parsedResult.recession) &&
                    parsedResult.recession[1] != null
                        ? String(parsedResult.recession[1])
                        : "",

                recession_3:
                    Array.isArray(parsedResult.recession) &&
                    parsedResult.recession[2] != null
                        ? String(parsedResult.recession[2])
                        : "",

                /*
                 * Only update bleeding if Groq actually returned
                 * a bleeding array.
                 *
                 * This preserves [false,false,false] correctly.
                 */
                bleeding_1:
                    Array.isArray(parsedResult.bleeding)
                        ? parsedResult.bleeding[0] === true
                        : false,

                bleeding_2:
                    Array.isArray(parsedResult.bleeding)
                        ? parsedResult.bleeding[1] === true
                        : false,

                bleeding_3:
                    Array.isArray(parsedResult.bleeding)
                        ? parsedResult.bleeding[2] === true
                        : false,

                mobility:
                    parsedResult.mobility != null
                        ? String(parsedResult.mobility)
                        : "",

                finding:
                    parsedResult.finding &&
                    typeof parsedResult.finding === "string"
                        ? parsedResult.finding
                        : "",
            }));
        }
    }, [parsedResult]);

    /*
     * VOICE PIPELINE
     *
     * Whisper
     *   ↓
     * Groq
     *   ↓
     * Detect missing values
     *   ↓
     * Put values into manual form
     *   ↓
     * Dentist completes missing values
     *   ↓
     * Dentist clicks Add Measurement
     *   ↓
     * Backend
     */
    const handleVoiceRecordingComplete = async (
        audioBlob: Blob
    ) => {
        setVoiceStatus("transcribing");
        setVoiceApiError("");
        setTranscript("");
        setParsedResult(null);
        setMissingFields(null);
        setShowMissingFieldsAlert(false);
        setValidationError("");
        setSuccessMessage("");

        let recognizedText = "";

        // -----------------------------
        // STEP 1: Whisper
        // -----------------------------
        try {
            recognizedText = await transcribeAudio(audioBlob);

            setTranscript(recognizedText);

            console.log(
                "Whisper transcript:",
                recognizedText
            );
        } catch (err: any) {
            const errorMessage =
                err.message ||
                "Unable to transcribe the recording.";

            setVoiceApiError(errorMessage);
            setVoiceStatus("error");

            console.error(
                "Transcription error:",
                err
            );

            return;
        }

        // -----------------------------
        // STEP 2: Groq
        // -----------------------------
        setVoiceStatus("processing_clinical");

        let groqParsed: ParsedClinicalData | null = null;

        try {
            const response = await parseTranscript(
                CURRENT_EXAMINATION_ID,
                recognizedText
            );

            if (response && response.parsed) {
                groqParsed = response.parsed;
            } else if (response) {
                groqParsed = response;
            } else {
                throw new Error(
                    "Unable to interpret the clinical transcript."
                );
            }

            console.log(
                "Groq parsed result:",
                groqParsed
            );

            // Store parsed result
            setParsedResult(groqParsed);
        } catch (err: any) {
            const errorMessage =
                err.message ||
                "Unable to interpret the clinical transcript.";

            setVoiceApiError(errorMessage);
            setVoiceStatus("error");

            console.error(
                "Parsing error:",
                err
            );

            return;
        }

        // -----------------------------
        // STEP 3: Validate tooth
        // -----------------------------
        if (!groqParsed || groqParsed.tooth == null) {
            setVoiceApiError(
                "Could not identify a valid tooth number from the transcript. Please enter the tooth number manually."
            );

            setVoiceStatus("error");

            console.warn(
                "Invalid tooth number:",
                groqParsed
            );

            // Still put any available clinical values
            // into the form.
            setFormData({
                ...initialFormData,

                tooth_number: "",

                pocket_1:
                    groqParsed?.pocket_depth?.[0] != null
                        ? String(
                              groqParsed.pocket_depth[0]
                          )
                        : "",

                pocket_2:
                    groqParsed?.pocket_depth?.[1] != null
                        ? String(
                              groqParsed.pocket_depth[1]
                          )
                        : "",

                pocket_3:
                    groqParsed?.pocket_depth?.[2] != null
                        ? String(
                              groqParsed.pocket_depth[2]
                          )
                        : "",

                recession_1:
                    groqParsed?.recession?.[0] != null
                        ? String(
                              groqParsed.recession[0]
                          )
                        : "",

                recession_2:
                    groqParsed?.recession?.[1] != null
                        ? String(
                              groqParsed.recession[1]
                          )
                        : "",

                recession_3:
                    groqParsed?.recession?.[2] != null
                        ? String(
                              groqParsed.recession[2]
                          )
                        : "",

                bleeding_1:
                    Array.isArray(groqParsed?.bleeding)
                        ? groqParsed.bleeding[0] === true
                        : false,

                bleeding_2:
                    Array.isArray(groqParsed?.bleeding)
                        ? groqParsed.bleeding[1] === true
                        : false,

                bleeding_3:
                    Array.isArray(groqParsed?.bleeding)
                        ? groqParsed.bleeding[2] === true
                        : false,

                mobility:
                    groqParsed?.mobility != null
                        ? String(groqParsed.mobility)
                        : "",

                finding:
                    typeof groqParsed?.finding === "string"
                        ? groqParsed.finding
                        : "",
            });

            return;
        }

        // -----------------------------
        // STEP 4: Identify missing data
        // -----------------------------
        const missing =
            identifyMissingFields(groqParsed);

        if (missing) {
            setMissingFields(missing);
            setShowMissingFieldsAlert(true);

            console.warn(
                "Missing fields detected:",
                missing
            );
        }

        /*
         * IMPORTANT:
         *
         * We STOP HERE.
         *
         * We DO NOT call applyClinicalData().
         *
         * The dentist must first complete the missing
         * values in the manual form.
         */

        if (missing) {
            setVoiceStatus("ready");
        } else {
            /*
             * Everything was provided by voice.
             *
             * We can still require the dentist to click
             * Add Measurement so the flow is consistent.
             */
            setVoiceStatus("ready");
        }
    };

    /*
     * Check whether a field is missing.
     */
    const isMissingField = (
        fieldName: string
    ): boolean => {
        if (!missingFields) return false;

        switch (fieldName) {
            case "pocket_1":
                return (
                    missingFields.pocket_depth.includes(
                        "mesial"
                    ) &&
                    formData.pocket_1 === ""
                );

            case "pocket_2":
                return (
                    missingFields.pocket_depth.includes(
                        "middle"
                    ) &&
                    formData.pocket_2 === ""
                );

            case "pocket_3":
                return (
                    missingFields.pocket_depth.includes(
                        "distal"
                    ) &&
                    formData.pocket_3 === ""
                );

            case "recession_1":
                return (
                    missingFields.recession.includes(
                        "mesial"
                    ) &&
                    formData.recession_1 === ""
                );

            case "recession_2":
                return (
                    missingFields.recession.includes(
                        "middle"
                    ) &&
                    formData.recession_2 === ""
                );

            case "recession_3":
                return (
                    missingFields.recession.includes(
                        "distal"
                    ) &&
                    formData.recession_3 === ""
                );

            case "bleeding":
                /*
                 * We cannot use:
                 *
                 * !bleeding_1 &&
                 * !bleeding_2 &&
                 * !bleeding_3
                 *
                 * because [false,false,false] is a valid
                 * "No bleeding" answer.
                 *
                 * The alert itself indicates that bleeding
                 * was not spoken.
                 */
                return missingFields.bleeding === true;

            case "mobility":
                return (
                    missingFields.mobility === true &&
                    formData.mobility === ""
                );

            case "finding":
                return (
                    missingFields.finding === true &&
                    formData.finding.trim() === ""
                );

            default:
                return false;
        }
    };

    const getInputBorderStyle = (
        fieldName: string
    ) => {
        if (isMissingField(fieldName)) {
            return "2px solid #ef4444";
        }

        return "1px solid #d8e2e3";
    };

    /*
     * MANUAL SUBMISSION
     *
     * This is now the ONLY place where clinical data
     * is sent to the backend.
     */
    const handleSubmit = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const tNum = Number(
            formData.tooth_number
        );

        // -----------------------------
        // Tooth validation
        // -----------------------------
        if (
            !formData.tooth_number ||
            isNaN(tNum) ||
            tNum < 1 ||
            tNum > 48
        ) {
            setValidationError(
                "Please enter a valid tooth number."
            );
            return;
        }

        setValidationError("");
        setManualApiError("");
        setSuccessMessage("");

        // -----------------------------
        // Check incomplete values
        // -----------------------------
        const incompleteFields: string[] = [];

        if (missingFields) {
            // Pocket depth
            missingFields.pocket_depth.forEach(
                (site) => {
                    if (
                        site === "mesial" &&
                        formData.pocket_1 === ""
                    ) {
                        incompleteFields.push(
                            "Pocket depth: MB"
                        );
                    }

                    if (
                        site === "middle" &&
                        formData.pocket_2 === ""
                    ) {
                        incompleteFields.push(
                            "Pocket depth: B"
                        );
                    }

                    if (
                        site === "distal" &&
                        formData.pocket_3 === ""
                    ) {
                        incompleteFields.push(
                            "Pocket depth: DB"
                        );
                    }
                }
            );

            // Recession
            missingFields.recession.forEach(
                (site) => {
                    if (
                        site === "mesial" &&
                        formData.recession_1 === ""
                    ) {
                        incompleteFields.push(
                            "Recession: MB"
                        );
                    }

                    if (
                        site === "middle" &&
                        formData.recession_2 === ""
                    ) {
                        incompleteFields.push(
                            "Recession: B"
                        );
                    }

                    if (
                        site === "distal" &&
                        formData.recession_3 === ""
                    ) {
                        incompleteFields.push(
                            "Recession: DB"
                        );
                    }
                }
            );

            
            // Mobility
            if (
                missingFields.mobility &&
                formData.mobility === ""
            ) {
                incompleteFields.push(
                    "Mobility"
                );
            }

            // Finding
            if (
                missingFields.finding &&
                formData.finding.trim() === ""
            ) {
                incompleteFields.push(
                    "Finding / Diagnosis"
                );
            }
        }

        if (incompleteFields.length > 0) {
            setValidationError(
                `Please complete the missing values before saving:\n\n• ${incompleteFields.join(
                    "\n• "
                )}`
            );
            return;
        }

        // -----------------------------
        // Build payload
        // -----------------------------
        setIsSubmitting(true);

        const pocketDepth = [
            formData.pocket_1 !== ""
                ? Number(formData.pocket_1)
                : null,

            formData.pocket_2 !== ""
                ? Number(formData.pocket_2)
                : null,

            formData.pocket_3 !== ""
                ? Number(formData.pocket_3)
                : null,
        ];

        const recession = [
            formData.recession_1 !== ""
                ? Number(formData.recession_1)
                : null,

            formData.recession_2 !== ""
                ? Number(formData.recession_2)
                : null,

            formData.recession_3 !== ""
                ? Number(formData.recession_3)
                : null,
        ];

        const bleeding = [
            Boolean(formData.bleeding_1),
            Boolean(formData.bleeding_2),
            Boolean(formData.bleeding_3),
        ];

        const mobility =
            formData.mobility !== ""
                ? Number(formData.mobility)
                : null;

        const finding =
            formData.finding.trim() || null;

        const payload = {
            examination_id:
                CURRENT_EXAMINATION_ID,

            clinical_data: {
                action: "update",
                tooth: tNum,
                pocket_depth: pocketDepth,
                recession: recession,
                bleeding: bleeding,
                mobility: mobility,
                finding: finding,
            },

            transcript:
                transcript || null,
        };

        console.log(
            "Final clinical payload:",
            payload
        );

        // -----------------------------
        // Save to backend
        // -----------------------------
        try {
            setVoiceStatus("saving_clinical");

            await applyClinicalData(payload);

            // -----------------------------
            // Update local chart
            // -----------------------------
            const updatedTooth: Tooth = {
                tooth: tNum,
                tooth_number: tNum,

                mesial: pocketDepth[0] ?? 0,
                middle: pocketDepth[1] ?? 0,
                distal: pocketDepth[2] ?? 0,

                pocket_1: pocketDepth[0] ?? undefined,
                pocket_2: pocketDepth[1] ?? undefined,
                pocket_3: pocketDepth[2] ?? undefined,

                recession_1:
                    recession[0] ?? undefined,
                recession_2:
                    recession[1] ?? undefined,
                recession_3:
                    recession[2] ?? undefined,

                bleeding:
                    bleeding[0] ||
                    bleeding[1] ||
                    bleeding[2],

                bleeding_1: bleeding[0],
                bleeding_2: bleeding[1],
                bleeding_3: bleeding[2],

                mobility:
                    mobility ?? undefined,

                finding:
                    finding || undefined,
            };

            setToothData((prev) => {
                const existingIndex =
                    prev.findIndex(
                        (item) =>
                            (item.tooth_number ??
                                item.tooth) ===
                            tNum
                    );

                if (existingIndex >= 0) {
                    const updated = [...prev];

                    updated[existingIndex] =
                        updatedTooth;

                    return updated;
                }

                return [
                    ...prev,
                    updatedTooth,
                ].sort(
                    (a, b) =>
                        (a.tooth_number ??
                            a.tooth) -
                        (b.tooth_number ??
                            b.tooth)
                );
            });

            setVoiceStatus("saved_clinical");

            setSuccessMessage(
                `Tooth ${tNum} clinical data updated successfully.`
            );

            // Clear form
            setFormData(initialFormData);

            // Clear missing state
            setMissingFields(null);
            setShowMissingFieldsAlert(false);
            setParsedResult(null);
            setTranscript("");
        } catch (err: any) {
            const errorMessage =
                err.message ||
                "Failed to save clinical measurement.";

            setManualApiError(errorMessage);
            setVoiceApiError(errorMessage);
            setVoiceStatus("error");

            console.error(
                "Clinical data save error:",
                err
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="dashboard">
            {/* ---------------- HEADER ---------------- */}
            <div className="page-header">
                <p className="label">
                    PATIENT RECORD
                </p>

                <h1>
                    Periodontal Chart
                </h1>

                <p>
                    John Mathew · PT-1024
                </p>
            </div>

            {/* ---------------- VOICE ---------------- */}
            <div
                className="voice-grid"
                style={{
                    marginBottom: "25px",
                }}
            >
                <VoiceRecorder
                    onRecordingComplete={
                        handleVoiceRecordingComplete
                    }
                    statusState={voiceStatus}
                    externalError={
                        voiceApiError
                    }
                />

                <TranscriptBox
                    transcript={transcript}
                    isTranscribing={
                        voiceStatus ===
                        "transcribing"
                    }
                    error={
                        voiceStatus === "error"
                            ? voiceApiError
                            : undefined
                    }
                />
            </div>

            {/* ---------------- AI RESULT ---------------- */}
            {parsedResult && (
                <div
                    style={{
                        marginBottom: "25px",
                    }}
                >
                    <AIInterpretation
                        parsedData={
                            parsedResult
                        }
                        isProcessing={
                            voiceStatus ===
                            "processing_clinical"
                        }
                        isSaving={
                            voiceStatus ===
                            "saving_clinical"
                        }
                        isSaved={
                            voiceStatus ===
                            "saved_clinical"
                        }
                        error={
                            voiceStatus === "error"
                                ? voiceApiError
                                : undefined
                        }
                    />
                </div>
            )}

            {/* ---------------- MISSING VALUES ALERT ---------------- */}
            {showMissingFieldsAlert &&
                missingFields &&
                parsedResult?.tooth != null && (
                    <div
                        className="notes-card"
                        style={{
                            marginBottom:
                                "25px",
                            borderLeft:
                                "4px solid #f59e0b",
                            backgroundColor:
                                "#fffbeb",
                        }}
                    >
                        <div
                            style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "flex-start",
                            }}
                        >
                            <div>
                                <p
                                    style={{
                                        fontSize:
                                            "16px",
                                        fontWeight:
                                            "600",
                                        color:
                                            "#d97706",
                                        marginBottom:
                                            "8px",
                                    }}
                                >
                                    ⚠️ Missing Clinical Values
                                </p>

                                <p
                                    style={{
                                        fontSize:
                                            "14px",
                                        color:
                                            "#92400e",
                                        marginBottom:
                                            "12px",
                                    }}
                                >
                                    Tooth{" "}
                                    {
                                        parsedResult.tooth
                                    }
                                    : Some clinical
                                    values were not
                                    provided. Please
                                    complete them
                                    manually below.
                                </p>

                                <div
                                    style={{
                                        fontSize:
                                            "13px",
                                        color:
                                            "#92400e",
                                    }}
                                >
                                    <p
                                        style={{
                                            fontWeight:
                                                "600",
                                            marginBottom:
                                                "6px",
                                        }}
                                    >
                                        Missing values:
                                    </p>

                                    <ul
                                        style={{
                                            margin:
                                                "0",
                                            paddingLeft:
                                                "20px",
                                        }}
                                    >
                                        {missingFields
                                            .pocket_depth
                                            .length >
                                            0 && (
                                            <li>
                                                Pocket
                                                depth:{" "}
                                                {missingFields.pocket_depth.join(
                                                    ", "
                                                )}
                                            </li>
                                        )}

                                        {missingFields
                                            .recession
                                            .length >
                                            0 && (
                                            <li>
                                                Recession:{" "}
                                                {missingFields.recession.join(
                                                    ", "
                                                )}
                                            </li>
                                        )}

                                        {missingFields.bleeding && (
                                            <li>
                                                Bleeding
                                                on
                                                probing
                                            </li>
                                        )}

                                        {missingFields.mobility && (
                                            <li>
                                                Mobility
                                            </li>
                                        )}

                                        {missingFields.finding && (
                                            <li>
                                                Finding /
                                                Diagnosis
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowMissingFieldsAlert(
                                        false
                                    )
                                }
                                style={{
                                    background:
                                        "none",
                                    border:
                                        "none",
                                    fontSize:
                                        "20px",
                                    cursor:
                                        "pointer",
                                    color:
                                        "#92400e",
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

            {/* ---------------- MANUAL ENTRY ---------------- */}
            <div
                className="notes-card"
                style={{
                    marginBottom: "25px",
                }}
            >
                <div className="section-heading">
                    <div>
                        <p className="label">
                            MANUAL ENTRY
                        </p>

                        <h2>
                            Add Clinical Measurement
                        </h2>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    style={{
                        marginTop: "15px",
                    }}
                >
                    {validationError && (
                        <p
                            className="error-message"
                            style={{
                                marginBottom:
                                    "15px",
                                whiteSpace:
                                    "pre-line",
                            }}
                        >
                            {validationError}
                        </p>
                    )}

                    {manualApiError && (
                        <p
                            className="error-message"
                            style={{
                                marginBottom:
                                    "15px",
                            }}
                        >
                            {manualApiError}
                        </p>
                    )}

                    {successMessage && (
                        <div
                            className="validation-message"
                            style={{
                                marginBottom:
                                    "15px",
                            }}
                        >
                            ✓{" "}
                            {successMessage}
                        </div>
                    )}

                    {/* TOP FIELDS */}
                    <div
                        style={{
                            display:
                                "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "15px",
                            marginBottom:
                                "15px",
                        }}
                    >
                        {/* TOOTH */}
                        <div>
                            <label
                                style={{
                                    display:
                                        "block",
                                    fontSize:
                                        "13px",
                                    fontWeight:
                                        "600",
                                    marginBottom:
                                        "5px",
                                }}
                            >
                                Tooth Number *
                            </label>

                            <input
                                type="number"
                                placeholder="e.g. 14"
                                value={
                                    formData.tooth_number
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        tooth_number:
                                            e.target
                                                .value,
                                    })
                                }
                                style={{
                                    width:
                                        "100%",
                                    padding:
                                        "10px",
                                    borderRadius:
                                        "8px",
                                    border:
                                        "1px solid #d8e2e3",
                                }}
                            />
                        </div>

                        {/* MOBILITY */}
                        <div>
                            <label
                                style={{
                                    display:
                                        "block",
                                    fontSize:
                                        "13px",
                                    fontWeight:
                                        "600",
                                    marginBottom:
                                        "5px",
                                }}
                            >
                                Mobility (0-3)

                                {isMissingField(
                                    "mobility"
                                ) && (
                                    <span
                                        style={{
                                            color:
                                                "#ef4444",
                                        }}
                                    >
                                        {" "}
                                        - Required
                                    </span>
                                )}
                            </label>

                            <input
                                type="number"
                                min="0"
                                max="3"
                                placeholder="0"
                                value={
                                    formData.mobility
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        mobility:
                                            e.target
                                                .value,
                                    })
                                }
                                style={{
                                    width:
                                        "100%",
                                    padding:
                                        "10px",
                                    borderRadius:
                                        "8px",
                                    border:
                                        getInputBorderStyle(
                                            "mobility"
                                        ),
                                    backgroundColor:
                                        isMissingField(
                                            "mobility"
                                        )
                                            ? "#fef2f2"
                                            : "transparent",
                                }}
                            />
                        </div>

                        {/* FINDING */}
                        <div>
                            <label
                                style={{
                                    display:
                                        "block",
                                    fontSize:
                                        "13px",
                                    fontWeight:
                                        "600",
                                    marginBottom:
                                        "5px",
                                }}
                            >
                                Finding / Diagnosis

                                {isMissingField(
                                    "finding"
                                ) && (
                                    <span
                                        style={{
                                            color:
                                                "#ef4444",
                                        }}
                                    >
                                        {" "}
                                        - Required
                                    </span>
                                )}
                            </label>

                            <input
                                type="text"
                                placeholder="e.g. Normal, Gingivitis"
                                value={
                                    formData.finding
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        finding:
                                            e.target
                                                .value,
                                    })
                                }
                                style={{
                                    width:
                                        "100%",
                                    padding:
                                        "10px",
                                    borderRadius:
                                        "8px",
                                    border:
                                        getInputBorderStyle(
                                            "finding"
                                        ),
                                    backgroundColor:
                                        isMissingField(
                                            "finding"
                                        )
                                            ? "#fef2f2"
                                            : "transparent",
                                }}
                            />
                        </div>
                    </div>

                    {/* POCKET DEPTH */}
                    <div
                        style={{
                            marginBottom:
                                "15px",
                        }}
                    >
                        <label
                            style={{
                                display:
                                    "block",
                                fontSize:
                                    "13px",
                                fontWeight:
                                    "600",
                                marginBottom:
                                    "5px",
                            }}
                        >
                            Pocket Depth (mm)
                        </label>

                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "1fr 1fr 1fr",
                                gap: "10px",
                            }}
                        >
                            {[
                                {
                                    key: "pocket_1",
                                    placeholder:
                                        "MB",
                                },
                                {
                                    key: "pocket_2",
                                    placeholder:
                                        "B",
                                },
                                {
                                    key: "pocket_3",
                                    placeholder:
                                        "DB",
                                },
                            ].map(
                                ({
                                    key,
                                    placeholder,
                                }) => (
                                    <div
                                        key={
                                            key
                                        }
                                    >
                                        <input
                                            type="number"
                                            placeholder={
                                                placeholder
                                            }
                                            value={
                                                formData[
                                                    key as keyof FormData
                                                ] as string
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFormData(
                                                    {
                                                        ...formData,
                                                        [key]:
                                                            e
                                                                .target
                                                                .value,
                                                    }
                                                )
                                            }
                                            style={{
                                                width:
                                                    "100%",
                                                padding:
                                                    "10px",
                                                borderRadius:
                                                    "8px",
                                                border:
                                                    getInputBorderStyle(
                                                        key
                                                    ),
                                                backgroundColor:
                                                    isMissingField(
                                                        key
                                                    )
                                                        ? "#fef2f2"
                                                        : "transparent",
                                            }}
                                        />

                                        {isMissingField(
                                            key
                                        ) && (
                                            <p
                                                style={{
                                                    fontSize:
                                                        "11px",
                                                    color:
                                                        "#ef4444",
                                                    marginTop:
                                                        "3px",
                                                }}
                                            >
                                                Required
                                            </p>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* RECESSION */}
                    <div
                        style={{
                            marginBottom:
                                "15px",
                        }}
                    >
                        <label
                            style={{
                                display:
                                    "block",
                                fontSize:
                                    "13px",
                                fontWeight:
                                    "600",
                                marginBottom:
                                    "5px",
                            }}
                        >
                            Gingival Recession (mm)
                        </label>

                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "1fr 1fr 1fr",
                                gap: "10px",
                            }}
                        >
                            {[
                                {
                                    key: "recession_1",
                                    placeholder:
                                        "MB",
                                },
                                {
                                    key: "recession_2",
                                    placeholder:
                                        "B",
                                },
                                {
                                    key: "recession_3",
                                    placeholder:
                                        "DB",
                                },
                            ].map(
                                ({
                                    key,
                                    placeholder,
                                }) => (
                                    <div
                                        key={
                                            key
                                        }
                                    >
                                        <input
                                            type="number"
                                            placeholder={
                                                placeholder
                                            }
                                            value={
                                                formData[
                                                    key as keyof FormData
                                                ] as string
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFormData(
                                                    {
                                                        ...formData,
                                                        [key]:
                                                            e
                                                                .target
                                                                .value,
                                                    }
                                                )
                                            }
                                            style={{
                                                width:
                                                    "100%",
                                                padding:
                                                    "10px",
                                                borderRadius:
                                                    "8px",
                                                border:
                                                    getInputBorderStyle(
                                                        key
                                                    ),
                                                backgroundColor:
                                                    isMissingField(
                                                        key
                                                    )
                                                        ? "#fef2f2"
                                                        : "transparent",
                                            }}
                                        />

                                        {isMissingField(
                                            key
                                        ) && (
                                            <p
                                                style={{
                                                    fontSize:
                                                        "11px",
                                                    color:
                                                        "#ef4444",
                                                    marginTop:
                                                        "3px",
                                                }}
                                            >
                                                Required
                                            </p>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* BLEEDING */}
                    <div
                        style={{
                            marginBottom:
                                "20px",
                            padding:
                                "12px",
                            borderRadius:
                                "8px",
                            backgroundColor:
                                isMissingField(
                                    "bleeding"
                                )
                                    ? "#fef2f2"
                                    : "transparent",
                            border:
                                isMissingField(
                                    "bleeding"
                                )
                                    ? "2px solid #ef4444"
                                    : "1px solid transparent",
                        }}
                    >
                        <label
                            style={{
                                display:
                                    "block",
                                fontSize:
                                    "13px",
                                fontWeight:
                                    "600",
                                marginBottom:
                                    "8px",
                            }}
                        >
                            Bleeding on Probing (BOP)

                            {isMissingField(
                                "bleeding"
                            ) && (
                                <span
                                    style={{
                                        color:
                                            "#ef4444",
                                    }}
                                >
                                    {" "}
                                    - Required
                                </span>
                            )}
                        </label>

                        <div
                            style={{
                                display:
                                    "flex",
                                gap:
                                    "20px",
                            }}
                        >
                            <label
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap:
                                        "6px",
                                    fontSize:
                                        "14px",
                                    cursor:
                                        "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        formData.bleeding_1
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setFormData(
                                            {
                                                ...formData,
                                                bleeding_1:
                                                    e
                                                        .target
                                                        .checked,
                                            }
                                        )
                                    }
                                />
                                MB
                            </label>

                            <label
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap:
                                        "6px",
                                    fontSize:
                                        "14px",
                                    cursor:
                                        "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        formData.bleeding_2
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setFormData(
                                            {
                                                ...formData,
                                                bleeding_2:
                                                    e
                                                        .target
                                                        .checked,
                                            }
                                        )
                                    }
                                />
                                B
                            </label>

                            <label
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap:
                                        "6px",
                                    fontSize:
                                        "14px",
                                    cursor:
                                        "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        formData.bleeding_3
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setFormData(
                                            {
                                                ...formData,
                                                bleeding_3:
                                                    e
                                                        .target
                                                        .checked,
                                            }
                                        )
                                    }
                                />
                                DB
                            </label>
                        </div>
                    </div>

                    {/* SUBMIT */}
                    <button
                        type="submit"
                        className="primary-button"
                        disabled={
                            isSubmitting
                        }
                    >
                        {isSubmitting
                            ? "Submitting to Server..."
                            : "Add Measurement"}
                    </button>
                </form>
            </div>

            {/* ---------------- PERIODONTAL CHART ---------------- */}
            <div className="chart-card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    Tooth
                                </th>

                                <th>
                                    Pocket Depth
                                    (MB / B / DB)
                                </th>

                                <th>
                                    Recession
                                    (MB / B / DB)
                                </th>

                                <th>
                                    Bleeding
                                    (MB / B / DB)
                                </th>

                                <th>
                                    Mobility
                                </th>

                                <th>
                                    Finding
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={
                                            6
                                        }
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "30px",
                                            color:
                                                "#6b7280",
                                        }}
                                    >
                                        Loading clinical
                                        measurements
                                        from Supabase...
                                    </td>
                                </tr>
                            ) : toothData.length ===
                              0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            6
                                        }
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "30px",
                                            color:
                                                "#6b7280",
                                        }}
                                    >
                                        No clinical
                                        measurements
                                        recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                toothData.map(
                                    (item) => {
                                        const toothNum =
                                            item.tooth_number ??
                                            item.tooth;

                                        const p1 =
                                            item.pocket_1 ??
                                            item.mesial;

                                        const p2 =
                                            item.pocket_2 ??
                                            item.middle;

                                        const p3 =
                                            item.pocket_3 ??
                                            item.distal;

                                        const r1 =
                                            item.recession_1 ??
                                            0;

                                        const r2 =
                                            item.recession_2 ??
                                            0;

                                        const r3 =
                                            item.recession_3 ??
                                            0;

                                        const b1 =
                                            item.bleeding_1 ??
                                            item.bleeding;

                                        const b2 =
                                            item.bleeding_2 ??
                                            item.bleeding;

                                        const b3 =
                                            item.bleeding_3 ??
                                            item.bleeding;

                                        const hasBleeding =
                                            b1 ||
                                            b2 ||
                                            b3;

                                        const bleedingLabel =
                                            hasBleeding
                                                ? [
                                                      b1 &&
                                                          "MB",
                                                      b2 &&
                                                          "B",
                                                      b3 &&
                                                          "DB",
                                                  ]
                                                      .filter(
                                                          Boolean
                                                      )
                                                      .join(
                                                          ", "
                                                      )
                                                : "No";

                                        return (
                                            <tr
                                                key={
                                                    toothNum
                                                }
                                            >
                                                <td>
                                                    <strong>
                                                        {
                                                            toothNum
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        p1
                                                    }{" "}
                                                    /{" "}
                                                    {
                                                        p2
                                                    }{" "}
                                                    /{" "}
                                                    {
                                                        p3
                                                    }{" "}
                                                    mm
                                                </td>

                                                <td>
                                                    {
                                                        r1
                                                    }{" "}
                                                    /{" "}
                                                    {
                                                        r2
                                                    }{" "}
                                                    /{" "}
                                                    {
                                                        r3
                                                    }{" "}
                                                    mm
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            hasBleeding
                                                                ? "bleeding-yes"
                                                                : "bleeding-no"
                                                        }
                                                    >
                                                        {hasBleeding
                                                            ? `Yes (${bleedingLabel})`
                                                            : "No"}
                                                    </span>
                                                </td>

                                                <td>
                                                    {item.mobility ??
                                                        0}
                                                </td>

                                                <td>
                                                    {item.finding ||
                                                        "-"}
                                                </td>
                                            </tr>
                                        );
                                    }
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </main>
    );
}

export default Chart;
