import { useEffect, useState } from "react";
import { applyClinicalData } from "../services/api";
import { supabase } from "../src/lib/supabase";

const CURRENT_EXAMINATION_ID = "58eb8a91-fd52-43b4-8bba-b6cde4f2442a";

interface Tooth {
    tooth: number;
    tooth_number?: number;
    mesial: number;
    middle: number;
    distal: number;
    pocket_1?: number;   // MB (Mesial-Buccal)
    pocket_2?: number;   // B (Buccal)
    pocket_3?: number;   // DB (Distal-Buccal)
    recession_1?: number; // MB
    recession_2?: number; // B
    recession_3?: number; // DB
    bleeding: boolean;
    bleeding_1?: boolean; // MB
    bleeding_2?: boolean; // B
    bleeding_3?: boolean; // DB
    mobility?: number;
    finding?: string;
}

const initialTeeth: Tooth[] = [
    { tooth: 11, mesial: 2, middle: 2, distal: 3, bleeding: false },
    { tooth: 12, mesial: 2, middle: 3, distal: 2, bleeding: false },
    { tooth: 13, mesial: 3, middle: 2, distal: 3, bleeding: false },
    { tooth: 14, mesial: 2, middle: 2, distal: 2, bleeding: false },
    { tooth: 15, mesial: 3, middle: 3, distal: 2, bleeding: true },
    { tooth: 16, mesial: 3, middle: 2, distal: 4, bleeding: true },
    { tooth: 17, mesial: 2, middle: 3, distal: 3, bleeding: false },
    { tooth: 18, mesial: 2, middle: 2, distal: 2, bleeding: false },
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

function Chart() {
    const [toothData, setToothData] = useState<Tooth[]>(initialTeeth);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [validationError, setValidationError] = useState("");
    const [apiError, setApiError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const channel = supabase
            .channel(`realtime:clinical_measurements:${CURRENT_EXAMINATION_ID}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "clinical_measurements",
                    filter: `examination_id=eq.${CURRENT_EXAMINATION_ID}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
                        const record = payload.new;
                        if (!record) return;

                        const toothNum = Number(record.tooth_number ?? record.tooth);
                        if (!toothNum || isNaN(toothNum)) return;

                        // Extract direct DB columns with fallback to array format if present
                        const p1 = record.pocket_1 ?? (Array.isArray(record.pocket_depth) ? record.pocket_depth[0] : 0);
                        const p2 = record.pocket_2 ?? (Array.isArray(record.pocket_depth) ? record.pocket_depth[1] : 0);
                        const p3 = record.pocket_3 ?? (Array.isArray(record.pocket_depth) ? record.pocket_depth[2] : 0);

                        const r1 = record.recession_1 ?? (Array.isArray(record.recession) ? record.recession[0] : 0);
                        const r2 = record.recession_2 ?? (Array.isArray(record.recession) ? record.recession[1] : 0);
                        const r3 = record.recession_3 ?? (Array.isArray(record.recession) ? record.recession[2] : 0);

                        const b1 = Boolean(record.bleeding_1 ?? (Array.isArray(record.bleeding) ? record.bleeding[0] : false));
                        const b2 = Boolean(record.bleeding_2 ?? (Array.isArray(record.bleeding) ? record.bleeding[1] : false));
                        const b3 = Boolean(record.bleeding_3 ?? (Array.isArray(record.bleeding) ? record.bleeding[2] : false));

                        const updatedTooth: Tooth = {
                            tooth: toothNum,
                            tooth_number: toothNum,
                            mesial: Number(p1 ?? 0),
                            middle: Number(p2 ?? 0),
                            distal: Number(p3 ?? 0),
                            pocket_1: Number(p1 ?? 0),
                            pocket_2: Number(p2 ?? 0),
                            pocket_3: Number(p3 ?? 0),
                            recession_1: Number(r1 ?? 0),
                            recession_2: Number(r2 ?? 0),
                            recession_3: Number(r3 ?? 0),
                            bleeding: b1 || b2 || b3,
                            bleeding_1: b1,
                            bleeding_2: b2,
                            bleeding_3: b3,
                            mobility: record.mobility != null ? Number(record.mobility) : 0,
                            finding: record.finding ? String(record.finding) : undefined,
                        };

                        setToothData((prev) => {
                            const existingIndex = prev.findIndex(
                                (item) => (item.tooth_number ?? item.tooth) === toothNum
                            );
                            if (existingIndex >= 0) {
                                const updated = [...prev];
                                updated[existingIndex] = updatedTooth;
                                return updated;
                            }
                            return [...prev, updatedTooth].sort(
                                (a, b) => (a.tooth_number ?? a.tooth) - (b.tooth_number ?? b.tooth)
                            );
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const tNum = Number(formData.tooth_number);
        if (!formData.tooth_number || isNaN(tNum) || tNum < 1 || tNum > 48) {
            setValidationError("Please enter a valid tooth number (1-48).");
            return;
        }

        setValidationError("");
        setApiError("");
        setSuccessMessage("");
        setIsSubmitting(true);

        const pocketDepth = [
            formData.pocket_1 !== "" ? Number(formData.pocket_1) : 0,
            formData.pocket_2 !== "" ? Number(formData.pocket_2) : 0,
            formData.pocket_3 !== "" ? Number(formData.pocket_3) : 0,
        ];

        const recession = [
            formData.recession_1 !== "" ? Number(formData.recession_1) : 0,
            formData.recession_2 !== "" ? Number(formData.recession_2) : 0,
            formData.recession_3 !== "" ? Number(formData.recession_3) : 0,
        ];

        const bleeding = [
            Boolean(formData.bleeding_1),
            Boolean(formData.bleeding_2),
            Boolean(formData.bleeding_3),
        ];

        const mobility = formData.mobility !== "" ? Number(formData.mobility) : 0;
        const finding = formData.finding.trim() || null;

        const payload = {
            examination_id: CURRENT_EXAMINATION_ID,
            clinical_data: {
                action: "record",
                tooth: tNum,
                pocket_depth: pocketDepth,
                recession: recession,
                bleeding: bleeding,
                mobility: mobility,
                finding: finding,
            },
            transcript: null,
        };

        try {
            await applyClinicalData(payload);

            const newMeasurement: Tooth = {
                tooth: tNum,
                tooth_number: tNum,
                mesial: pocketDepth[0],
                middle: pocketDepth[1],
                distal: pocketDepth[2],
                pocket_1: pocketDepth[0],
                pocket_2: pocketDepth[1],
                pocket_3: pocketDepth[2],
                recession_1: recession[0],
                recession_2: recession[1],
                recession_3: recession[2],
                bleeding: bleeding[0] || bleeding[1] || bleeding[2],
                bleeding_1: bleeding[0],
                bleeding_2: bleeding[1],
                bleeding_3: bleeding[2],
                mobility: mobility,
                finding: finding || undefined,
            };

            setToothData((prev) => {
                const existingIndex = prev.findIndex(
                    (item) => (item.tooth_number ?? item.tooth) === tNum
                );
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = newMeasurement;
                    return updated;
                }
                return [...prev, newMeasurement].sort(
                    (a, b) => (a.tooth_number ?? a.tooth) - (b.tooth_number ?? b.tooth)
                );
            });

            setSuccessMessage(`Tooth ${tNum} measurement recorded successfully!`);
            setFormData(initialFormData);
        } catch (err: any) {
            setApiError(err.message || "Failed to connect to backend server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="dashboard">
            <div className="page-header">
                <p className="label">PATIENT RECORD</p>

                <h1>Periodontal Chart</h1>

                <p>
                    John Mathew · PT-1024
                </p>
            </div>

            {/* Manual Measurement Entry Form */}
            <div className="notes-card" style={{ marginBottom: "25px" }}>
                <div className="section-heading">
                    <div>
                        <p className="label">MANUAL ENTRY</p>
                        <h2>Add Clinical Measurement</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: "15px" }}>
                    {validationError && (
                        <p className="error-message" style={{ marginBottom: "15px" }}>
                            {validationError}
                        </p>
                    )}

                    {apiError && (
                        <p className="error-message" style={{ marginBottom: "15px" }}>
                            {apiError}
                        </p>
                    )}

                    {successMessage && (
                        <div className="validation-message" style={{ marginBottom: "15px" }}>
                            ✓ {successMessage}
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "15px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                                Tooth Number *
                            </label>
                            <input
                                type="number"
                                placeholder="e.g. 14"
                                value={formData.tooth_number}
                                onChange={(e) => setFormData({ ...formData, tooth_number: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                                Mobility (0-3)
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.mobility}
                                onChange={(e) => setFormData({ ...formData, mobility: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                                Finding / Diagnosis
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Normal, Gingivitis"
                                value={formData.finding}
                                onChange={(e) => setFormData({ ...formData, finding: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                        </div>
                    </div>

                    {/* Pocket Depths */}
                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                            Pocket Depth (mm)
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                            <input
                                type="number"
                                placeholder="MB"
                                value={formData.pocket_1}
                                onChange={(e) => setFormData({ ...formData, pocket_1: e.target.value })}
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                            <input
                                type="number"
                                placeholder="B"
                                value={formData.pocket_2}
                                onChange={(e) => setFormData({ ...formData, pocket_2: e.target.value })}
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                            <input
                                type="number"
                                placeholder="DB"
                                value={formData.pocket_3}
                                onChange={(e) => setFormData({ ...formData, pocket_3: e.target.value })}
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                        </div>
                    </div>

                    {/* Recession */}
                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                            Gingival Recession (mm)
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                            <input
                                type="number"
                                placeholder="MB"
                                value={formData.recession_1}
                                onChange={(e) => setFormData({ ...formData, recession_1: e.target.value })}
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                            <input
                                type="number"
                                placeholder="B"
                                value={formData.recession_2}
                                onChange={(e) => setFormData({ ...formData, recession_2: e.target.value })}
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                            <input
                                type="number"
                                placeholder="DB"
                                value={formData.recession_3}
                                onChange={(e) => setFormData({ ...formData, recession_3: e.target.value })}
                                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d8e2e3" }}
                            />
                        </div>
                    </div>

                    {/* Bleeding on Probing */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
                            Bleeding on Probing (BOP)
                        </label>
                        <div style={{ display: "flex", gap: "20px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={formData.bleeding_1}
                                    onChange={(e) => setFormData({ ...formData, bleeding_1: e.target.checked })}
                                />
                                MB
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={formData.bleeding_2}
                                    onChange={(e) => setFormData({ ...formData, bleeding_2: e.target.checked })}
                                />
                                B
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={formData.bleeding_3}
                                    onChange={(e) => setFormData({ ...formData, bleeding_3: e.target.checked })}
                                />
                                DB
                            </label>
                        </div>
                    </div>

                    <button type="submit" className="primary-button" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting to Server..." : "Add Measurement"}
                    </button>
                </form>
            </div>

            {/* Existing Periodontal Chart Table */}
            <div className="chart-card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tooth</th>
                                <th>Pocket Depth (MB / B / DB)</th>
                                <th>Recession (MB / B / DB)</th>
                                <th>Bleeding (MB / B / DB)</th>
                                <th>Mobility</th>
                                <th>Finding</th>
                            </tr>
                        </thead>

                        <tbody>
                            {toothData.map((item) => {
                                const toothNum = item.tooth_number ?? item.tooth;
                                const p1 = item.pocket_1 ?? item.mesial;
                                const p2 = item.pocket_2 ?? item.middle;
                                const p3 = item.pocket_3 ?? item.distal;

                                const r1 = item.recession_1 ?? 0;
                                const r2 = item.recession_2 ?? 0;
                                const r3 = item.recession_3 ?? 0;

                                const b1 = item.bleeding_1 ?? item.bleeding;
                                const b2 = item.bleeding_2 ?? item.bleeding;
                                const b3 = item.bleeding_3 ?? item.bleeding;

                                const hasBleeding = b1 || b2 || b3;
                                const bleedingLabel = hasBleeding
                                    ? [b1 && "MB", b2 && "B", b3 && "DB"].filter(Boolean).join(", ")
                                    : "No";

                                return (
                                    <tr key={toothNum}>
                                        <td>
                                            <strong>{toothNum}</strong>
                                        </td>

                                        <td>{p1} / {p2} / {p3} mm</td>

                                        <td>{r1} / {r2} / {r3} mm</td>

                                        <td>
                                            <span
                                                className={
                                                    hasBleeding
                                                        ? "bleeding-yes"
                                                        : "bleeding-no"
                                                }
                                            >
                                                {hasBleeding ? `Yes (${bleedingLabel})` : "No"}
                                            </span>
                                        </td>

                                        <td>{item.mobility ?? 0}</td>

                                        <td>{item.finding || "-"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="notes-card">
                <h2>Clinical Notes</h2>

                <textarea
                    placeholder="Add clinical notes..."
                />

                <button className="primary-button">
                    Save Clinical Record
                </button>
            </div>
        </main>
    );
}

export default Chart;
