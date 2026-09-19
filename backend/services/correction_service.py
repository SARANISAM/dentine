 
from __future__ import annotations

from typing import Any

from models.clinical_models import CorrectionCommand
from utils.context_manager import ExaminationContext


SUPPORTED_FIELDS = {
    "pocket_depth",
    "recession",
    "bleeding",
    "mobility",
    "finding",
}


def _parse_corrected_value(
    field_name: str,
    value: str,
) -> Any:

    value = value.strip()

    if field_name in {
        "pocket_depth",
        "recession",
    }:

        parts = value.replace(",", " ").split()

        if len(parts) != 3:
            raise ValueError(
                f"{field_name} correction must contain "
                "exactly 3 values."
            )

        return tuple(
            float(part)
            for part in parts
        )

    if field_name == "bleeding":

        parts = value.replace(",", " ").split()

        if len(parts) != 3:
            raise ValueError(
                "Bleeding correction must contain "
                "exactly 3 values."
            )

        parsed = []

        for part in parts:

            normalized = part.lower()

            if normalized in {
                "true",
                "yes",
                "bleeding",
            }:
                parsed.append(True)

            elif normalized in {
                "false",
                "no",
                "none",
                "not",
            }:
                parsed.append(False)

            else:
                raise ValueError(
                    f"Cannot interpret bleeding value: {part}"
                )

        return tuple(parsed)

    if field_name == "mobility":

        return int(value)

    if field_name == "finding":

        return value

    raise ValueError(
        f"Unsupported correction field: {field_name}"
    )


def correct_last_value(
    context: ExaminationContext,
    new_value: str,
) -> dict[str, Any]:

    if context.last_measurement is None:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": (
                "There is no previous measurement "
                "to correct."
            ),
        }

    field_name = context.last_field

    if field_name is None:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": (
                "The previous measurement field "
                "could not be identified."
            ),
        }

    try:
        parsed_value = _parse_corrected_value(
            field_name,
            new_value,
        )
    except ValueError as exc:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": str(exc),
        }

    previous = dict(
        context.last_measurement
    )

    updated = dict(
        context.last_measurement
    )

    updated[field_name] = parsed_value

    return {
        "success": True,
        "requires_confirmation": False,
        "tooth": context.last_tooth,
        "field": field_name,
        "previous": previous,
        "updated": updated,
    }


def apply_correction(
    context: ExaminationContext,
    command: CorrectionCommand,
) -> dict[str, Any]:

    if command.tooth != context.last_tooth:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": (
                "The correction refers to tooth "
                f"{command.tooth}, but the current "
                f"context is tooth {context.last_tooth}."
            ),
        }

    if command.field_name not in SUPPORTED_FIELDS:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": (
                f"Unsupported correction field: "
                f"{command.field_name}"
            ),
        }

    try:
        corrected_value = _parse_corrected_value(
            command.field_name,
            command.corrected_value,
        )
    except ValueError as exc:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": str(exc),
        }

    if context.last_measurement is None:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": (
                "There is no previous measurement "
                "to correct."
            ),
        }

    previous = dict(
        context.last_measurement
    )

    updated = dict(
        context.last_measurement
    )

    updated[command.field_name] = corrected_value

    return {
        "success": True,
        "requires_confirmation": False,
        "tooth": command.tooth,
        "field": command.field_name,
        "previous": previous,
        "updated": updated,
        "reason": command.reason,
    }