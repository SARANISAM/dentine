from utils.context_manager import ContextManager


def test_create_new_context():
    manager = ContextManager()

    context = manager.get_or_create("exam-test-1")

    assert context is not None
    assert context.examination_id == "exam-test-1"


def test_new_context_has_no_previous_measurement():
    manager = ContextManager()

    context = manager.get_or_create("exam-test-2")

    assert context.last_tooth is None
    assert context.last_measurement is None
    assert context.last_field is None


def test_context_stores_measurement():
    manager = ContextManager()

    measurement = {
        "action": "record",
        "tooth": 16,
        "pocket_depth": (3.0, 2.0, 4.0),
    }

    context = manager.update(
        "exam-test-3",
        measurement,
    )

    assert context.last_tooth == 16
    assert context.last_measurement == measurement
    assert context.last_field == "pocket_depth"


def test_contexts_are_separate():
    manager = ContextManager()

    measurement_1 = {
        "action": "record",
        "tooth": 16,
        "pocket_depth": (3.0, 2.0, 4.0),
    }

    measurement_2 = {
        "action": "record",
        "tooth": 26,
        "pocket_depth": (2.0, 3.0, 2.0),
    }

    manager.update("exam-1", measurement_1)
    manager.update("exam-2", measurement_2)

    context_1 = manager.get("exam-1")
    context_2 = manager.get("exam-2")

    assert context_1.last_tooth == 16
    assert context_2.last_tooth == 26