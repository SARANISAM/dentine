from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ExaminationContext:
    examination_id: str
    last_tooth: Optional[int] = None
    last_measurement: Optional[dict[str, Any]] = None
    last_measurement_id: Optional[str] = None
    last_field: Optional[str] = None
    recent_commands: list[dict[str, Any]] = field(default_factory=list)
    max_history: int = 20

    def update(
        self,
        validated_data: dict[str, Any],
        measurement_id: Optional[str] = None,
    ) -> None:
        self.last_tooth = validated_data.get("tooth")
        self.last_measurement = dict(validated_data)
        self.last_field = self._detect_last_field(validated_data)

        if measurement_id is not None:
            self.last_measurement_id = measurement_id

        self.recent_commands.append(dict(validated_data))

        if len(self.recent_commands) > self.max_history:
            self.recent_commands.pop(0)

    def _detect_last_field(
        self,
        data: dict[str, Any],
    ) -> Optional[str]:
        preferred_fields = [
            "pocket_depth",
            "recession",
            "bleeding",
            "mobility",
            "finding",
        ]

        for field_name in preferred_fields:
            if data.get(field_name) is not None:
                return field_name

        return None


class ContextManager:
    def __init__(self) -> None:
        self._contexts: dict[str, ExaminationContext] = {}

    def get_or_create(
        self,
        examination_id: str,
    ) -> ExaminationContext:
        if examination_id not in self._contexts:
            self._contexts[examination_id] = ExaminationContext(
                examination_id=examination_id
            )

        return self._contexts[examination_id]

    def get(
        self,
        examination_id: str,
    ) -> Optional[ExaminationContext]:
        return self._contexts.get(examination_id)

    def update(
        self,
        examination_id: str,
        validated_data: dict[str, Any],
        measurement_id: Optional[str] = None,
    ) -> ExaminationContext:
        context = self.get_or_create(examination_id)

        context.update(
            validated_data,
            measurement_id=measurement_id,
        )

        return context

    def clear(
        self,
        examination_id: str,
    ) -> None:
        self._contexts.pop(examination_id, None)


context_manager = ContextManager()