from models.clinical_models import CorrectionCommand
from services.correction_service import (
    apply_correction,
    correct_last_value,
)
from utils.context_manager import ContextManager


def create_context_with_measurement():
    manager = ContextManager()

    measurement = {
        "action": "record",
        "tooth": 16,
        "pocket_depth": (3.0, 2.0, 4.0),
        "recession": (0.0, 1.0, 0.0),
        "bleeding": (True, False, True),
    }

    manager.update(
        "exam-correction",
        measurement,
    )

    return manager.get("exam-correction")


def test_correct_last_value():
    context = create_context_with_measurement()

    result = correct_last_value(
        context,
        "3 2 5",
    )

    assert result["success"] is True
    assert result["tooth"] == 16
    assert result["field"] == "bleeding" or result["field"] == "pocket_depth"


def test_correct_pocket_depth():
    context = create_context_with_measurement()

    command = CorrectionCommand(
        tooth=16,
        field_name="pocket_depth",
        corrected_value="3 2 5",
        reason="Previous value was incorrect",
    )

    result = apply_correction(
        context,
        command,
    )

    assert result["success"] is True
    assert result["tooth"] == 16
    assert result["field"] == "pocket_depth"
    assert result["updated"]["pocket_depth"] == (
        3.0,
        2.0,
        5.0,
    )


def test_correct_recession():
    context = create_context_with_measurement()

    command = CorrectionCommand(
        tooth=16,
        field_name="recession",
        corrected_value="1 2 3",
        reason="Correction",
    )

    result = apply_correction(
        context,
        command,
    )

    assert result["success"] is True
    assert result["updated"]["recession"] == (
        1.0,
        2.0,
        3.0,
    )


def test_correct_bleeding():
    context = create_context_with_measurement()

    command = CorrectionCommand(
        tooth=16,
        field_name="bleeding",
        corrected_value="true false false",
        reason="Correction",
    )

    result = apply_correction(
        context,
        command,
    )

    assert result["success"] is True
    assert result["updated"]["bleeding"] == (
        True,
        False,
        False,
    )


def test_wrong_tooth_requires_confirmation():
    context = create_context_with_measurement()

    command = CorrectionCommand(
        tooth=26,
        field_name="pocket_depth",
        corrected_value="3 2 5",
        reason="Correction",
    )

    result = apply_correction(
        context,
        command,
    )

    assert result["success"] is False
    assert result["requires_confirmation"] is True


def test_invalid_pocket_depth_correction():
    context = create_context_with_measurement()

    command = CorrectionCommand(
        tooth=16,
        field_name="pocket_depth",
        corrected_value="3 2",
        reason="Correction",
    )

    result = apply_correction(
        context,
        command,
    )

    assert result["success"] is False
    assert result["requires_confirmation"] is True


def test_correction_without_previous_measurement():
    manager = ContextManager()

    context = manager.get_or_create(
        "empty-examination"
    )

    command = CorrectionCommand(
        tooth=16,
        field_name="pocket_depth",
        corrected_value="3 2 5",
        reason="Correction",
    )

    result = apply_correction(
        context,
        command,
    )

    assert result["success"] is False
    assert result["requires_confirmation"] is True