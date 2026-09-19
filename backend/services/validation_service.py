"""
services/validation_service.py

Deterministic clinical validation pipeline for Dentine.

Pipeline order
--------------
  Raw dict (e.g. from Gemini JSON)
      ↓ Step 1 — Pydantic structural parse
      ↓ Step 2 — Tooth number (FDI)
      ↓ Step 3 — Measurement format (3 values, numeric)
      ↓ Step 4 — Required-field presence
      ↓ Step 5 — Boolean field type check
      ↓ Step 6 — Conflict detection (CAL consistency, logical ranges)
      ↓ Step 7 — Clinical threshold check (high values → confirmation, not rejection)
      → VALID | INVALID | CONFIRM

Guarantees
----------
- Never invents missing measurements.
- Never silently modifies clinician-provided values.
- All decisions are rule-based; no LLM involved.
- Thresholds flag for clinician confirmation, not automatic rejection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from pydantic import ValidationError

from models.clinical_models import ClinicalUpdateCommand

# ---------------------------------------------------------------------------
# Clinical thresholds (evidence-based, not arbitrary)
# Values above these are clinically possible but unusual enough to warrant
# a clinician's explicit confirmation before saving.
# ---------------------------------------------------------------------------

# Pocket depth (mm): >9 mm is extremely severe; flag rather than reject.
POCKET_DEPTH_CONFIRM_THRESHOLD = 9.0

# Recession (mm): >7 mm is rare; flag for confirmation.
RECESSION_CONFIRM_THRESHOLD = 7.0

# Maximum clinically plausible values (hard rejection above these).
POCKET_DEPTH_MAX = 20.0
RECESSION_MAX = 15.0

# Minimum non-negative value for linear measurements.
MEASUREMENT_MIN = 0.0


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------

@dataclass
class ValidationResult:
    """
    Structured result returned by validate_clinical_command().

    Attributes
    ----------
    valid               : The data passed all hard-fail checks.
    requires_confirmation: Soft flags were raised; a clinician must confirm.
    warnings            : Human-readable list of issues found (both hard and soft).
    validated_data      : The cleaned, validated dict — only populated when valid=True.
                          Never contains invented or silently altered values.
    errors              : Hard validation failures that caused valid=False.
    """
    valid: bool
    requires_confirmation: bool = False
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    validated_data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "requires_confirmation": self.requires_confirmation,
            "warnings": self.warnings,
            "validated_data": self.validated_data if self.valid else {},
        }


# ---------------------------------------------------------------------------
# Internal step validators
# Each returns (passed: bool, messages: list[str])
# ---------------------------------------------------------------------------

def _check_tooth(tooth: Any) -> tuple[bool, list[str]]:
    """Step 2 — Validate FDI permanent adult tooth number."""
    _FDI_PERMANENT = frozenset(
        (q * 10 + p) for q in (1, 2, 3, 4) for p in range(1, 9)
    )
    if not isinstance(tooth, int):
        return False, [f"Tooth number must be an integer, got {type(tooth).__name__}."]
    if tooth not in _FDI_PERMANENT:
        return False, [
            f"'{tooth}' is not a valid FDI permanent adult tooth number. "
            f"Expected: 11-18, 21-28, 31-38, 41-48."
        ]
    return True, []


def _check_three_site(
    values: Any, field_name: str
) -> tuple[bool, list[str]]:
    """Step 3 — Validate a three-site measurement field."""
    if values is None:
        return True, []  # Optional field; absence is fine.

    errors: list[str] = []

    if not isinstance(values, (list, tuple)):
        errors.append(f"'{field_name}' must be a list or tuple of three numbers.")
        return False, errors

    if len(values) != 3:
        errors.append(
            f"'{field_name}' must contain exactly 3 values "
            f"(mesio-buccal, buccal, disto-buccal); got {len(values)}."
        )
        return False, errors

    for i, v in enumerate(values):
        if not isinstance(v, (int, float)):
            errors.append(
                f"'{field_name}[{i}]' must be numeric; got {type(v).__name__} ({v!r})."
            )

    return len(errors) == 0, errors


def _check_measurements_non_negative(
    values: Optional[tuple], field_name: str
) -> tuple[bool, list[str]]:
    """Step 3b — Measurements must be ≥ 0."""
    if values is None:
        return True, []
    errors = []
    for i, v in enumerate(values):
        if v < MEASUREMENT_MIN:
            errors.append(f"'{field_name}[{i}]' is negative ({v}). Measurements must be ≥ 0.")
    return len(errors) == 0, errors


def _check_required_fields(data: dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Step 4 — Required-field presence.

    At minimum, a valid update command must carry 'action' and 'tooth'.
    At least one clinical measurement field must be present to be meaningful.
    """
    errors: list[str] = []
    required = ("action", "tooth")
    for key in required:
        if data.get(key) is None:
            errors.append(f"Required field '{key}' is missing.")

    measurement_fields = ("pocket_depth", "recession", "bleeding", "mobility", "finding")
    if not any(data.get(f) is not None for f in measurement_fields):
        errors.append(
            "At least one measurement field must be provided "
            "(pocket_depth, recession, bleeding, mobility, or finding)."
        )
    return len(errors) == 0, errors


def _check_boolean_fields(data: dict[str, Any]) -> tuple[bool, list[str]]:
    """Step 5 — Boolean fields must contain actual booleans."""
    bleeding = data.get("bleeding")
    if bleeding is None:
        return True, []

    errors: list[str] = []
    if not isinstance(bleeding, (list, tuple)) or len(bleeding) != 3:
        errors.append("'bleeding' must be a list or tuple of exactly 3 boolean values.")
        return False, errors

    for i, v in enumerate(bleeding):
        if not isinstance(v, bool):
            errors.append(
                f"'bleeding[{i}]' must be a boolean (true/false); "
                f"got {type(v).__name__} ({v!r}). "
                f"Integers are not accepted to avoid ambiguity."
            )
    return len(errors) == 0, errors


def _check_conflicts(data: dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Step 6 — Conflict detection.

    Checks performed:
    - Clinical Attachment Level (CAL) = pocket_depth + recession.
      A CAL > 20 mm per site is biologically implausible.
    - Hard ceiling on individual measurements.
    """
    errors: list[str] = []
    pd = data.get("pocket_depth")
    rc = data.get("recession")

    # Hard ceiling checks
    if pd is not None:
        for i, v in enumerate(pd):
            if v > POCKET_DEPTH_MAX:
                errors.append(
                    f"pocket_depth[{i}] = {v} mm exceeds the maximum plausible value "
                    f"of {POCKET_DEPTH_MAX} mm. Please verify the entry."
                )

    if rc is not None:
        for i, v in enumerate(rc):
            if v > RECESSION_MAX:
                errors.append(
                    f"recession[{i}] = {v} mm exceeds the maximum plausible value "
                    f"of {RECESSION_MAX} mm. Please verify the entry."
                )

    # CAL plausibility
    if pd is not None and rc is not None:
        for i in range(3):
            cal = pd[i] + rc[i]
            if cal > 20.0:
                errors.append(
                    f"Site {i}: CAL (pocket_depth + recession) = {cal} mm is "
                    f"biologically implausible (>20 mm). Check both values."
                )

    return len(errors) == 0, errors


def _check_thresholds(data: dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Step 7 — Soft clinical threshold flags.

    Values above these thresholds are clinically possible but unusual.
    They trigger requires_confirmation=True rather than validation failure.
    The clinician's data is NEVER modified.
    """
    warnings: list[str] = []
    pd = data.get("pocket_depth")
    rc = data.get("recession")

    if pd is not None:
        for i, v in enumerate(pd):
            if POCKET_DEPTH_CONFIRM_THRESHOLD < v <= POCKET_DEPTH_MAX:
                site = ["mesio-buccal", "buccal", "disto-buccal"][i]
                warnings.append(
                    f"pocket_depth at {site} = {v} mm is unusually high "
                    f"(>{POCKET_DEPTH_CONFIRM_THRESHOLD} mm). "
                    f"Please confirm this reading is correct."
                )

    if rc is not None:
        for i, v in enumerate(rc):
            if RECESSION_CONFIRM_THRESHOLD < v <= RECESSION_MAX:
                site = ["mesio-buccal", "buccal", "disto-buccal"][i]
                warnings.append(
                    f"recession at {site} = {v} mm is unusually high "
                    f"(>{RECESSION_CONFIRM_THRESHOLD} mm). "
                    f"Please confirm this reading is correct."
                )

    return warnings


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def validate_clinical_command(raw: dict[str, Any]) -> ValidationResult:
    """
    Run the full deterministic validation pipeline on a raw dict.

    Parameters
    ----------
    raw : dict
        The parsed JSON from an upstream source (e.g. Gemini response).
        This function treats it as untrusted input.

    Returns
    -------
    ValidationResult
        Inspect `.valid`, `.requires_confirmation`, `.warnings`, and
        `.validated_data` to decide what to do next.

    Notes
    -----
    - The pipeline stops early on hard failures and returns immediately.
    - Threshold flags (soft) do not invalidate data; they set
      `requires_confirmation = True` so the UI can prompt the clinician.
    - `validated_data` is sourced exclusively from Pydantic's output.
      No values are invented or silently changed.
    """
    result = ValidationResult(valid=False)

    # ------------------------------------------------------------------
    # Step 1 — Pydantic structural parse
    # ------------------------------------------------------------------
    try:
        command = ClinicalUpdateCommand.model_validate(raw)
    except ValidationError as exc:
        for error in exc.errors():
            loc = " → ".join(str(part) for part in error["loc"])
            result.errors.append(f"[{loc}] {error['msg']}")
        return result  # Hard fail — nothing further to check.

    # Work from the validated dict from here on.
    data: dict[str, Any] = command.model_dump()

    # ------------------------------------------------------------------
    # Step 2 — Tooth number (belt-and-suspenders; Pydantic already checked)
    # ------------------------------------------------------------------
    ok, msgs = _check_tooth(data["tooth"])
    if not ok:
        result.errors.extend(msgs)
        return result

    # ------------------------------------------------------------------
    # Step 3 — Three-site measurement format + non-negative values
    # ------------------------------------------------------------------
    for field_name in ("pocket_depth", "recession"):
        ok, msgs = _check_three_site(data.get(field_name), field_name)
        if not ok:
            result.errors.extend(msgs)
            return result
        ok, msgs = _check_measurements_non_negative(data.get(field_name), field_name)
        if not ok:
            result.errors.extend(msgs)
            return result

    # ------------------------------------------------------------------
    # Step 4 — Required-field presence
    # ------------------------------------------------------------------
    ok, msgs = _check_required_fields(data)
    if not ok:
        result.errors.extend(msgs)
        return result

    # ------------------------------------------------------------------
    # Step 5 — Boolean field types
    # ------------------------------------------------------------------
    ok, msgs = _check_boolean_fields(data)
    if not ok:
        result.errors.extend(msgs)
        return result

    # ------------------------------------------------------------------
    # Step 6 — Conflict detection
    # ------------------------------------------------------------------
    ok, msgs = _check_conflicts(data)
    if not ok:
        result.errors.extend(msgs)
        return result

    # ------------------------------------------------------------------
    # Step 7 — Clinical threshold flags (soft — confirmation, not rejection)
    # ------------------------------------------------------------------
    threshold_warnings = _check_thresholds(data)
    if threshold_warnings:
        result.warnings.extend(threshold_warnings)
        result.requires_confirmation = True

    # ------------------------------------------------------------------
    # All checks passed — return validated data as-is (no mutation)
    # ------------------------------------------------------------------
    result.valid = True
    result.validated_data = data
    return result
