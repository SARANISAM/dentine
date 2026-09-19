"""
models/clinical_models.py

Pydantic models for Dentine clinical data.

Design notes
------------
- extra = "forbid" on every model — unknown fields raise a validation error.
- FDI notation: two-digit permanent adult tooth numbers (11-18, 21-28, 31-38, 41-48).
- Three-site measurements (mesio-buccal / buccal / disto-buccal) are represented
  as a tuple of exactly three floats. Pydantic enforces the length automatically.
- All models are reusable directly as FastAPI request/response bodies.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# FDI permanent adult tooth set (11-18, 21-28, 31-38, 41-48)
# ---------------------------------------------------------------------------
_FDI_PERMANENT: frozenset[int] = frozenset(
    (quadrant * 10 + position)
    for quadrant in (1, 2, 3, 4)
    for position in range(1, 9)
)

# Annotated alias used in field declarations for clarity
FDITooth = Annotated[
    int,
    Field(
        description=(
            "FDI permanent adult tooth number. "
            "Valid values: 11-18 (upper right), 21-28 (upper left), "
            "31-38 (lower left), 41-48 (lower right)."
        ),
        examples=[11, 36, 47],
    ),
]

# Three-site measurement: mesio-buccal | buccal | disto-buccal
# Using tuple[float, float, float] means Pydantic enforces exactly 3 elements.
ThreeSiteValues = Annotated[
    tuple[float, float, float],
    Field(
        description="Exactly three site measurements: (mesio-buccal, buccal, disto-buccal).",
        examples=[(3.0, 2.0, 4.0)],
    ),
]


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ClinicalAction(str, Enum):
    """The type of clinical operation being requested."""
    RECORD  = "record"   # Insert a new measurement
    UPDATE  = "update"   # Modify an existing measurement
    DELETE  = "delete"   # Remove a measurement
    CORRECT = "correct"  # Explicit correction of a previous entry
    QUERY   = "query"    # Read / look up current values


class MobilityGrade(int, Enum):
    """
    Miller classification of tooth mobility.
    0 = physiological, 1 = up to 1mm horizontal, 2 = >1mm horizontal,
    3 = vertical (depressible).
    """
    NONE     = 0
    GRADE_1  = 1
    GRADE_2  = 2
    GRADE_3  = 3


# ---------------------------------------------------------------------------
# ClinicalMeasurement — stored / returned record
# ---------------------------------------------------------------------------

class ClinicalMeasurement(BaseModel):
    """
    A single periodontal measurement record for one tooth.
    Used as both a response model and an internal data container.
    """
    model_config = ConfigDict(extra="forbid")

    tooth: FDITooth
    pocket_depth: Optional[ThreeSiteValues] = Field(
        default=None,
        description="Probing pocket depths in mm at three sites.",
    )
    recession: Optional[ThreeSiteValues] = Field(
        default=None,
        description="Gingival recession in mm at three sites.",
    )
    bleeding: Optional[tuple[bool, bool, bool]] = Field(
        default=None,
        description="Bleeding on probing at three sites (mesio-buccal, buccal, disto-buccal).",
    )
    mobility: Optional[MobilityGrade] = Field(
        default=None,
        description="Tooth mobility grade (0–3, Miller classification).",
    )
    finding: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Free-text clinical observation or note.",
    )

    @field_validator("tooth")
    @classmethod
    def tooth_must_be_valid_fdi(cls, value: int) -> int:
        if value not in _FDI_PERMANENT:
            raise ValueError(
                f"{value} is not a valid FDI permanent adult tooth number. "
                f"Expected one of: 11-18, 21-28, 31-38, 41-48."
            )
        return value

    @field_validator("pocket_depth", "recession", mode="before")
    @classmethod
    def must_be_non_negative(cls, values: object) -> object:
        if values is None:
            return values
        for v in values:
            if v < 0:
                raise ValueError("Measurement values must be non-negative.")
        return values


# ---------------------------------------------------------------------------
# ClinicalUpdateCommand — parsed voice / API command
# ---------------------------------------------------------------------------

class ClinicalUpdateCommand(BaseModel):
    """
    Represents a parsed command to create or update a clinical measurement.
    Typically produced by the voice parsing service and consumed by routes.
    """
    model_config = ConfigDict(extra="forbid")

    action: ClinicalAction = Field(
        description="The clinical operation to perform.",
    )
    tooth: FDITooth
    pocket_depth: Optional[ThreeSiteValues] = Field(
        default=None,
        description="Probing pocket depths in mm (mesio-buccal, buccal, disto-buccal).",
    )
    recession: Optional[ThreeSiteValues] = Field(
        default=None,
        description="Gingival recession in mm (mesio-buccal, buccal, disto-buccal).",
    )
    bleeding: Optional[tuple[bool, bool, bool]] = Field(
        default=None,
        description="Bleeding on probing at three sites.",
    )
    mobility: Optional[MobilityGrade] = Field(
        default=None,
        description="Tooth mobility grade (Miller 0–3).",
    )
    finding: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Free-text clinical observation.",
    )

    @field_validator("tooth")
    @classmethod
    def tooth_must_be_valid_fdi(cls, value: int) -> int:
        if value not in _FDI_PERMANENT:
            raise ValueError(
                f"{value} is not a valid FDI permanent adult tooth number. "
                f"Expected one of: 11-18, 21-28, 31-38, 41-48."
            )
        return value

    @field_validator("pocket_depth", "recession", mode="before")
    @classmethod
    def must_be_non_negative(cls, values: object) -> object:
        if values is None:
            return values
        for v in values:
            if v < 0:
                raise ValueError("Measurement values must be non-negative.")
        return values


# ---------------------------------------------------------------------------
# CorrectionCommand — explicit correction of a previous entry
# ---------------------------------------------------------------------------

class CorrectionCommand(BaseModel):
    """
    Signals that a previously recorded value should be corrected.

    'field_name' identifies which field to correct on the referenced tooth.
    'corrected_value' is the new value expressed as a string so the service
    layer can parse it into the appropriate type (numeric, boolean, etc.).
    """
    model_config = ConfigDict(extra="forbid")

    tooth: FDITooth
    field_name: str = Field(
        description=(
            "The field to correct: 'pocket_depth', 'recession', "
            "'bleeding', 'mobility', or 'finding'."
        ),
        pattern=r"^(pocket_depth|recession|bleeding|mobility|finding)$",
    )
    corrected_value: str = Field(
        description="The corrected value as a string, to be parsed by the service layer.",
        min_length=1,
        max_length=200,
    )
    reason: Optional[str] = Field(
        default=None,
        max_length=300,
        description="Optional reason for the correction (audit trail).",
    )

    @field_validator("tooth")
    @classmethod
    def tooth_must_be_valid_fdi(cls, value: int) -> int:
        if value not in _FDI_PERMANENT:
            raise ValueError(
                f"{value} is not a valid FDI permanent adult tooth number."
            )
        return value


# ---------------------------------------------------------------------------
# ConfirmationRequired — returned when user confirmation is needed
# ---------------------------------------------------------------------------

class ConfirmationRequired(BaseModel):
    """
    Returned by the API when an action cannot proceed without explicit
    user confirmation (e.g. destructive operations, ambiguous voice input).
    """
    model_config = ConfigDict(extra="forbid")

    confirmation_id: str = Field(
        description="Unique token the client must echo back to confirm the action.",
    )
    message: str = Field(
        description="Human-readable description of what the user is being asked to confirm.",
    )
    pending_action: ClinicalUpdateCommand | CorrectionCommand = Field(
        description="The action that will execute once confirmed.",
    )
    expires_in_seconds: int = Field(
        default=30,
        ge=5,
        le=300,
        description="How long (in seconds) this confirmation token remains valid.",
    )
