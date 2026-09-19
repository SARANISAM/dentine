from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.clinical_models import (
    ClinicalUpdateCommand,
    CorrectionCommand,
)

from services.correction_service import apply_correction
from services.groq_parser_service import parse_transcript

from services.database_service import (
    get_measurement_by_tooth,
    save_measurement,
    update_measurement,
)

from services.validation_service import validate_clinical_command
from utils.context_manager import context_manager


router = APIRouter(
    prefix="/api/clinical",
    tags=["Clinical"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class ApplyClinicalRequest(BaseModel):
    examination_id: str
    clinical_data: ClinicalUpdateCommand
    transcript: Optional[str] = None


class CorrectionRequest(BaseModel):
    examination_id: str
    correction: CorrectionCommand
    transcript: Optional[str] = None


# ============================================================
# TEST ROUTE
# ============================================================

@router.get("/test")
def clinical_test():
    return {
        "status": "ok",
        "message": "Clinical API is working",
    }


# ============================================================
# VALIDATE
# ============================================================

@router.post("/validate")
def validate_clinical_data(
    request: ApplyClinicalRequest,
):
    raw_data = request.clinical_data.model_dump(mode="json")

    result = validate_clinical_command(raw_data)

    return result.to_dict() | {
        "examination_id": request.examination_id,
        "transcript": request.transcript,
    }


# ============================================================
# APPLY
# ============================================================

@router.post("/apply")
def apply_clinical_data(
    request: ApplyClinicalRequest,
):
    raw_data = request.clinical_data.model_dump(mode="json")

    result = validate_clinical_command(raw_data)

    if not result.valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Clinical data validation failed",
                "errors": result.errors,
            },
        )

    # Check whether this tooth already exists
    existing_measurement = get_measurement_by_tooth(
        examination_id=request.examination_id,
        tooth_number=result.validated_data["tooth"],
    )

    # Update existing measurement or insert a new one
    if existing_measurement:
        saved_measurement = update_measurement(
            measurement_id=str(existing_measurement["id"]),
            payload=result.validated_data,
        )
    else:
        saved_measurement = save_measurement(
            result.validated_data
            | {
                "examination_id": request.examination_id,
            }
        )

    # Store validated data and database ID in active context
    context_manager.update(
        request.examination_id,
        result.validated_data,
        measurement_id=str(saved_measurement["id"]),
    )

    return {
        "success": True,
        "status": (
            "confirmation_required"
            if result.requires_confirmation
            else "validated"
        ),
        "examination_id": request.examination_id,
        "measurement": result.validated_data,
        "measurement_id": saved_measurement["id"],
        "warnings": result.warnings,
        "requires_confirmation": result.requires_confirmation,
        "transcript": request.transcript,
    }


# ============================================================
# CORRECT
# ============================================================

@router.post("/correct")
def correct_clinical_data(
    request: CorrectionRequest,
):
    context = context_manager.get_or_create(
        request.examination_id
    )

    result = apply_correction(
        context,
        request.correction,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result,
        )

    measurement_id = context.last_measurement_id

    if measurement_id is None:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "requires_confirmation": True,
                "message": (
                    "The previous measurement has no database ID."
                ),
            },
        )

    updated_measurement = update_measurement(
        measurement_id,
        result["updated"],
    )

    context.last_measurement = result["updated"]

    return result | {
        "examination_id": request.examination_id,
        "measurement_id": updated_measurement["id"],
        "transcript": request.transcript,
    }


# ============================================================
# PARSE
# ============================================================

@router.post("/parse")
def parse_clinical_data(
    transcript: str,
):
    return {
        "success": True,
        "status": "received",
        "transcript": transcript,
        "message": (
            "Gemini parsing will be connected "
            "after the clinical pipeline is stable."
        ),
    }


# ============================================================
# PARSE TRANSCRIPT WITH GROQ
# ============================================================

@router.post("/parse-transcript")
def parse_transcript_data(
    examination_id: str,
    transcript: str,
):
    try:
        # Step 1: Parse transcript using Groq
        parsed = parse_transcript(transcript)

        # Step 2: Check whether Groq returned an update
        if parsed.get("action") != "update":
            return {
                "success": True,
                "examination_id": examination_id,
                "transcript": transcript,
                "parsed": parsed,
                "validation": None,
            }

        # Step 3: Validate the structured clinical data
        validation_result = validate_clinical_command(parsed)

        # Step 4: Return parsed and validated results
        return {
            "success": True,
            "examination_id": examination_id,
            "transcript": transcript,
            "parsed": parsed,
            "validation": validation_result.to_dict(),
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )


# ============================================================
# PARSE + VALIDATE + SAVE
# ============================================================

@router.post("/process-transcript")
def process_transcript(
    examination_id: str,
    transcript: str,
):
    try:
        # 1. Parse transcript with Groq
        parsed = parse_transcript(transcript)

        # 2. Handle non-update responses
        if parsed.get("action") != "update":
            return {
                "success": True,
                "examination_id": examination_id,
                "transcript": transcript,
                "parsed": parsed,
                "validation": None,
                "saved": False,
            }

        # 3. Validate parsed clinical data
        validation_result = validate_clinical_command(parsed)

        if not validation_result.valid:
            return {
                "success": False,
                "examination_id": examination_id,
                "transcript": transcript,
                "parsed": parsed,
                "validation": validation_result.to_dict(),
                "saved": False,
            }

        if validation_result.requires_confirmation:
            return {
                "success": True,
                "examination_id": examination_id,
                "transcript": transcript,
                "parsed": parsed,
                "validation": validation_result.to_dict(),
                "saved": False,
                "requires_confirmation": True,
            }

        # 4. Get validated clinical data
        validated_data = validation_result.validated_data

        # 5. Check whether this tooth already exists
        #    in the current examination
        existing_measurement = get_measurement_by_tooth(
            examination_id=examination_id,
            tooth_number=validated_data["tooth"],
        )

        # 6. Update existing tooth or insert new tooth
        if existing_measurement:
            saved_measurement = update_measurement(
                measurement_id=str(existing_measurement["id"]),
                payload=validated_data,
            )
        else:
            saved_measurement = save_measurement(
                validated_data
                | {
                    "examination_id": examination_id,
                }
            )

        # 7. Update active examination context
        context_manager.update(
            examination_id,
            validated_data,
            measurement_id=str(saved_measurement["id"]),
        )

        # 8. Return final result
        return {
            "success": True,
            "examination_id": examination_id,
            "transcript": transcript,
            "parsed": parsed,
            "validation": validation_result.to_dict(),
            "saved": True,
            "measurement_id": saved_measurement["id"],
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )