"""
services/database_service.py

All Supabase database access lives here.
Routes import from this module — they never touch the Supabase client directly.
"""

from typing import Any

from database.supabase_client import get_client


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------

def get_patient(patient_id: str) -> dict | None:
    """
    Fetch a single patient record by primary key.
    Returns the patient dict or None if not found.
    """
    client = get_client()
    response = (
        client.table("patients")
        .select("*")
        .eq("id", patient_id)
        .maybe_single()
        .execute()
    )
    return response.data


def create_patient(payload: dict[str, Any]) -> dict:
    """
    Insert a new patient row and return the created record.
    """
    client = get_client()
    response = (
        client.table("patients")
        .insert(payload)
        .execute()
    )
    return response.data[0]


# ---------------------------------------------------------------------------
# Examinations
# ---------------------------------------------------------------------------

def create_examination(payload: dict[str, Any]) -> dict:
    """
    Insert a new examination record linked to a patient.
    Returns the created examination row.
    """
    client = get_client()
    response = (
        client.table("examinations")
        .insert(payload)
        .execute()
    )
    return response.data[0]


def get_examination(examination_id: str) -> dict | None:
    """
    Fetch a single examination record by primary key.
    Returns the examination dict or None if not found.
    """
    client = get_client()
    response = (
        client.table("examinations")
        .select("*")
        .eq("id", examination_id)
        .maybe_single()
        .execute()
    )
    return response.data


# ---------------------------------------------------------------------------
# Clinical Measurements
# ---------------------------------------------------------------------------

def _prepare_measurement_payload(
    payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert the validated clinical structure into the column structure
    used by the clinical_measurements table.
    """

    data: dict[str, Any] = {}

    # Only fields that actually exist in clinical_measurements.
    if "examination_id" in payload:
        data["examination_id"] = payload["examination_id"]

    if "tooth" in payload:
        data["tooth_number"] = payload["tooth"]

    # Three-site pocket depth
    pocket_depth = payload.get("pocket_depth")

    if pocket_depth is not None:
        data["pocket_1"] = pocket_depth[0]
        data["pocket_2"] = pocket_depth[1]
        data["pocket_3"] = pocket_depth[2]

    # Three-site recession
    recession = payload.get("recession")

    if recession is not None:
        data["recession_1"] = recession[0]
        data["recession_2"] = recession[1]
        data["recession_3"] = recession[2]

    # Three-site bleeding
    bleeding = payload.get("bleeding")

    if bleeding is not None:
        data["bleeding_1"] = bleeding[0]
        data["bleeding_2"] = bleeding[1]
        data["bleeding_3"] = bleeding[2]

    # Single-value fields
    if "mobility" in payload:
        data["mobility"] = payload["mobility"]

    if "finding" in payload:
        data["finding"] = payload["finding"]

    return data

def save_measurement(payload: dict[str, Any]) -> dict:
    """
    Insert a new clinical measurement row.
    """
    client = get_client()

    database_payload = _prepare_measurement_payload(payload)

    response = (
        client.table("clinical_measurements")
        .insert(database_payload)
        .execute()
    )

    return response.data[0]


def update_measurement(
    measurement_id: str,
    payload: dict[str, Any],
) -> dict:
    """
    Update an existing clinical measurement row by primary key.

    The incoming payload uses the clinical model structure.
    It is converted to the database column structure before updating.
    """
    client = get_client()

    database_payload = _prepare_measurement_payload(payload)

    response = (
        client.table("clinical_measurements")
        .update(database_payload)
        .eq("id", measurement_id)
        .execute()
    )

    return response.data[0]

# ---------------------------------------------------------------------------
# Voice Events
# ---------------------------------------------------------------------------

def save_voice_event(payload: dict[str, Any]) -> dict:
    """
    Insert a new voice event associated with an examination session.
    Returns the created voice event row.
    """
    client = get_client()
    response = (
        client.table("voice_events")
        .insert(payload)
        .execute()
    )
    return response.data[0]


def get_voice_events(examination_id: str) -> list[dict]:
    """
    Fetch all voice events for a given examination, ordered by creation time.
    Returns an empty list if none exist.
    """
    client = get_client()
    response = (
        client.table("voice_events")
        .select("*")
        .eq("examination_id", examination_id)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data or []