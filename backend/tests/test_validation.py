from services.validation_service import validate_clinical_command


def test_valid_clinical_command():
    data = {
        "action": "record",
        "tooth": 16,
        "pocket_depth": [3, 2, 4],
        "recession": [0, 1, 0],
        "bleeding": [True, False, True],
        "mobility": 0,
    }

    result = validate_clinical_command(data)

    assert result.valid is True
    assert result.validated_data is not None


def test_invalid_fdi_tooth():
    data = {
        "action": "record",
        "tooth": 19,
        "pocket_depth": [3, 2, 4],
    }

    result = validate_clinical_command(data)

    assert result.valid is False


def test_invalid_pocket_depth_count():
    data = {
        "action": "record",
        "tooth": 16,
        "pocket_depth": [3, 2],
    }

    result = validate_clinical_command(data)

    assert result.valid is False


def test_negative_measurement():
    data = {
        "action": "record",
        "tooth": 16,
        "pocket_depth": [-1, 2, 4],
    }

    result = validate_clinical_command(data)

    assert result.valid is False


def test_invalid_bleeding_count():
    data = {
        "action": "record",
        "tooth": 16,
        "bleeding": [True, False],
    }

    result = validate_clinical_command(data)

    assert result.valid is False


def test_invalid_mobility():
    data = {
        "action": "record",
        "tooth": 16,
        "mobility": 4,
    }

    result = validate_clinical_command(data)

    assert result.valid is False


def test_missing_clinical_measurement():
    data = {
        "action": "record",
        "tooth": 16,
    }

    result = validate_clinical_command(data)

    assert result.valid is False