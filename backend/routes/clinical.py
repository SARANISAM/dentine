from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.clinical_models import (
    ClinicalUpdateCommand,
    CorrectionCommand,
)
from services.correction_service import apply_correction
from services.database_service import (
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

    # Save validated measurement to Supabase.
    saved_measurement = save_measurement(
        result.validated_data
        | {
            "examination_id": request.examination_id,
        }
    )

    # Store validated data and database ID in active context.
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