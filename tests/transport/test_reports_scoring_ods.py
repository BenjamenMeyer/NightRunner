"""Tests for the event scoring ODS export.

The export is a static snapshot of what the Score Finalizer calculated. It used
to write live OpenFormula sums that recomputed an absolute weighted total from
per-task columns, which silently replaced relative-mode scores as soon as a
spreadsheet recalculated the file. These tests pin the snapshot behaviour.
"""
import io
import zipfile
import xml.etree.ElementTree as ET

from nightrunner_backend.reports_scoring_ods import generate_event_scoring_ods

TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"


# Relative mode: station scores sit on a 0-10 scale and are weighted into the final.
OVERALL = [
    {"patrolId": "p1", "patrolName": "Wolves", "patrolNumber": 3, "troops": "Troop 12", "totalScore": 17.5},
    {"patrolId": "p2", "patrolName": "Ravens & Co", "patrolNumber": 1, "troops": "Troop 7, Troop 9", "totalScore": 20.0},
    {"patrolId": "p3", "patrolName": "Foxes", "patrolNumber": None, "troops": "", "totalScore": 17.5},
]
STATIONS = [
    {
        "stationId": "s1", "stationName": "First Aid", "stationWeight": 2.0,
        "patrols": [
            {"patrolId": "p1", "score": 7.5},
            {"patrolId": "p2", "score": 10.0},
            {"patrolId": "p3", "score": 5.0},
        ],
    },
    {
        "stationId": "s2", "stationName": "Knots/Lashing", "stationWeight": 1.0,
        "patrols": [
            {"patrolId": "p1", "score": 2.5},
            {"patrolId": "p2", "score": 0.0},
            {"patrolId": "p3", "score": 7.5},
        ],
    },
]


def _content_xml(data: bytes) -> str:
    zf = zipfile.ZipFile(io.BytesIO(data))
    assert zf.testzip() is None
    assert zf.read("mimetype").decode() == "application/vnd.oasis.opendocument.spreadsheet"
    return zf.read("content.xml").decode("utf-8")


def _sheet_rows(root, sheet_name):
    """Every row of a sheet as a list of cells, numbers as floats and everything else as text."""
    for table in root.iter(f"{{{TABLE_NS}}}table"):
        if table.get(f"{{{TABLE_NS}}}name") != sheet_name:
            continue
        rows = []
        for row in table.iter(f"{{{TABLE_NS}}}table-row"):
            cells = []
            for cell in row.iter(f"{{{TABLE_NS}}}table-cell"):
                value = cell.get(f"{{{OFFICE_NS}}}value")
                cells.append(float(value) if value is not None else "".join(cell.itertext()))
            rows.append(cells)
        return rows
    raise AssertionError(f"sheet not found: {sheet_name}")


def _summary_data_rows(root):
    return [r for r in _sheet_rows(root, "Event Summary") if r and isinstance(r[0], float)]


def test_ods_is_well_formed_with_one_sheet_per_station():
    content = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS))
    root = ET.fromstring(content)
    names = [t.get(f"{{{TABLE_NS}}}name") for t in root.iter(f"{{{TABLE_NS}}}table")]
    assert names == ["Event Summary", "First Aid", "Knots-Lashing"]


def test_ods_contains_no_live_formulas():
    """A formula would recalculate an absolute sum and clobber relative scores."""
    content = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS, scoring_mode="relative"))
    assert "table:formula" not in content


def test_relative_scores_are_preserved_as_handed_in():
    content = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS, scoring_mode="relative"))
    rows = _summary_data_rows(ET.fromstring(content))

    wolves = next(r for r in rows if r[2] == "Wolves")
    # 7.5 x weight 2.0 at First Aid, 2.5 x weight 1.0 at Knots
    assert wolves[4] == 15.0
    assert wolves[5] == 2.5
    assert wolves[-1] == 17.5


def test_station_columns_sum_to_the_final_score():
    content = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS, scoring_mode="relative"))
    for row in _summary_data_rows(ET.fromstring(content)):
        assert abs(sum(row[4:-1]) - row[-1]) < 0.01, row


def test_patrols_are_ranked_by_final_score_with_ties_sharing_a_rank():
    content = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS))
    rows = _summary_data_rows(ET.fromstring(content))
    assert [r[2] for r in rows] == ["Ravens & Co", "Wolves", "Foxes"]
    assert [r[0] for r in rows] == [1.0, 2.0, 2.0]


def test_missing_patrol_number_and_troops_render_blank():
    content = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS))
    foxes = next(r for r in _summary_data_rows(ET.fromstring(content)) if r[2] == "Foxes")
    assert foxes[1] == ""
    assert foxes[3] == ""


def test_station_sheet_shows_score_and_weighted_contribution():
    content = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS, scoring_mode="relative"))
    rows = _sheet_rows(ET.fromstring(content), "First Aid")
    ravens = next(r for r in rows if r and r[0] == "Ravens & Co")
    assert ravens[3] == 10.0
    assert ravens[4] == 20.0  # station weight 2.0


def test_scoring_mode_is_labelled():
    relative = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS, scoring_mode="relative"))
    assert "Relative to Max Patrol" in relative

    absolute = _content_xml(generate_event_scoring_ods("Night Ops 2026", OVERALL, STATIONS))
    assert "Absolute Score (Weighted Sum)" in absolute
    assert "Relative to Max Patrol" not in absolute


def test_event_with_no_patrols_or_stations_still_produces_a_valid_file():
    content = _content_xml(generate_event_scoring_ods("Empty Event", [], []))
    ET.fromstring(content)
