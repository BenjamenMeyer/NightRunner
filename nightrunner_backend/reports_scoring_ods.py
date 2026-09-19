import io
import zipfile
from typing import List, Dict, Any, Optional


def _escape_xml(text: str) -> str:
    """Escapes special XML characters."""
    if text is None:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _col_to_letter(col_idx: int) -> str:
    """Converts 0-indexed column integer to spreadsheet column letter (0 -> A, 1 -> B, 26 -> AA)."""
    result = ""
    col_idx += 1
    while col_idx > 0:
        col_idx, remainder = divmod(col_idx - 1, 26)
        result = chr(65 + remainder) + result
    return result


def _sanitize_sheet_name(name: str) -> str:
    """Sanitizes sheet name for ODF / Excel compatibility."""
    clean = (name or "Sheet").replace("[", "").replace("]", "").replace(":", "").replace("*", "").replace("?", "").replace("/", "-").replace("\\", "-")
    return clean[:31] if len(clean) > 31 else clean


def _patrol_number_text(p: Dict[str, Any]) -> str:
    """Renders a patrol number for a spreadsheet cell, blank when unset."""
    num = p.get("patrolNumber")
    return "" if num in (None, "") else str(num)


def _patrol_troops_text(p: Dict[str, Any]) -> str:
    """Renders the troop(s) a patrol's members belong to, blank when unknown."""
    troops = p.get("troops")
    if isinstance(troops, (list, tuple)):
        troops = ", ".join(str(t) for t in troops if t)
    return str(troops) if troops else ""


# Sheet layout: Event Summary is A Rank | B Patrol # | C Patrol | D Troop(s) | E.. Stations | Final Score
MODE_LABELS = {
    "absolute": "Absolute Score (Weighted Sum)",
    "relative": "Relative to Max Patrol (10pt Scale)",
}

SNAPSHOT_NOTE = (
    "Static snapshot of the finalized Score Finalizer results. Cells hold values, "
    "not live formulas, so editing one will not recalculate the others."
)


def _num_cell(value: float) -> str:
    """A plain numeric cell. No formula, so the value survives recalculation."""
    val = float(value)
    return (
        f'<table:table-cell office:value-type="float" office:value="{val}">'
        f'<text:p>{round(val, 2)}</text:p>'
        f'</table:table-cell>'
    )


def _text_cell(value: Any = "") -> str:
    return f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(value)}</text:p></table:table-cell>'


def _competition_ranks(sorted_patrols: List[Dict[str, Any]]) -> Dict[str, int]:
    """Standard competition ranking (1, 2, 2, 4) over patrols already sorted high to low."""
    ranks = {}
    prev_score = None
    prev_rank = 0
    for idx, p in enumerate(sorted_patrols):
        score = round(float(p.get("totalScore", 0.0)), 4)
        if prev_score is not None and score == prev_score:
            ranks[p["patrolId"]] = prev_rank
        else:
            prev_rank = idx + 1
            prev_score = score
            ranks[p["patrolId"]] = prev_rank
    return ranks


def generate_event_scoring_ods(
    event_name: str,
    overall_patrols: List[Dict[str, Any]],
    station_breakdowns: Optional[List[Dict[str, Any]]] = None,
    scoring_mode: str = "absolute"
) -> bytes:
    """Generates an OpenDocument Spreadsheet (.ods) workbook containing Event Summary and Station sheets.

    This is a static snapshot: every cell holds the value the Score Finalizer
    calculated. It deliberately contains no formulas. An earlier version wrote
    live OpenFormula sums, but those always recomputed an absolute weighted sum
    from per-task columns, so they silently overwrote relative-mode scores the
    moment a spreadsheet recalculated the file. A live-formula export can be
    added alongside this one later.

    :param event_name: Display name of the event
    :param overall_patrols: List of patrol dicts [{patrolId, patrolName, patrolNumber, troops, totalScore}]
    :param station_breakdowns: List of station dicts [{stationId, stationName, stationWeight, patrols: [...]}]
    :param scoring_mode: "absolute" or "relative". Labelling only -- scores arrive already calculated.
    """
    station_breakdowns = station_breakdowns or []
    mode_label = MODE_LABELS.get(scoring_mode, MODE_LABELS["absolute"])

    # Sort overall patrols by score descending to match standard presentation
    sorted_patrols = sorted(overall_patrols, key=lambda p: float(p.get("totalScore", 0.0)), reverse=True)
    patrol_order = [p["patrolId"] for p in sorted_patrols]
    patrol_name_map = {p["patrolId"]: p.get("patrolName", f"Patrol {p['patrolId']}") for p in sorted_patrols}
    patrol_obj_map = {p["patrolId"]: p for p in sorted_patrols}
    rank_map = _competition_ranks(sorted_patrols)

    sheets_xml_list = []

    # Map station IDs to sanitized sheet names & sheet metadata
    station_meta = {}
    for idx, st in enumerate(station_breakdowns):
        s_id = st["stationId"]
        raw_name = st.get("stationName") or f"Station {idx + 1}"
        sheet_name = _sanitize_sheet_name(raw_name)
        # Avoid duplicate sheet names
        existing_names = [m["sheetName"] for m in station_meta.values()]
        unique_name = sheet_name
        counter = 1
        while unique_name in existing_names or unique_name == "Event Summary":
            unique_name = f"{sheet_name[:28]}_{counter}"
            counter += 1

        station_meta[s_id] = {
            "sheetName": unique_name,
            "rawName": raw_name,
            "weight": float(st.get("stationWeight", 1.0)),
            "patrols": {p["patrolId"]: p for p in st.get("patrols", [])}
        }

    # ==========================================
    # 1. BUILD EVENT SUMMARY SHEET
    # ==========================================
    summary_sheet_name = "Event Summary"
    summary_rows = []

    # Title, then the scoring mode this snapshot was finalized under
    summary_title = f"{event_name} - Event Score Summary"
    summary_rows.append(f'<table:table-row>{_text_cell(summary_title)}</table:table-row>')
    summary_rows.append(f'<table:table-row>{_text_cell("Scoring mode: " + mode_label)}</table:table-row>')
    summary_rows.append(f'<table:table-row>{_text_cell(SNAPSHOT_NOTE)}</table:table-row>')
    summary_rows.append('<table:table-row/>')

    # Header Row 1: Titles
    h1_cells = [_text_cell("Rank"), _text_cell("Patrol #"), _text_cell("Patrol"), _text_cell("Troop(s)")]
    for st in station_breakdowns:
        h1_cells.append(_text_cell(station_meta[st["stationId"]]["rawName"]))
    h1_cells.append(_text_cell("Final Score"))
    summary_rows.append(f'<table:table-row>{"".join(h1_cells)}</table:table-row>')

    # Header Row 2: station weights, already applied to the station columns below
    h2_cells = [_text_cell(), _text_cell(), _text_cell(), _text_cell("Station Weight")]
    for st in station_breakdowns:
        h2_cells.append(_num_cell(station_meta[st["stationId"]]["weight"]))
    h2_cells.append(_text_cell("Grand Total"))
    summary_rows.append(f'<table:table-row>{"".join(h2_cells)}</table:table-row>')

    summary_rows.append('<table:table-row/>')

    for pid in patrol_order:
        p_obj = patrol_obj_map.get(pid, {})
        r_cells = [
            _num_cell(rank_map.get(pid, 0)),
            _text_cell(_patrol_number_text(p_obj)),
            _text_cell(patrol_name_map[pid]),
            _text_cell(_patrol_troops_text(p_obj)),
        ]

        # Station columns: the finalized station score with its station weight applied
        for st in station_breakdowns:
            s_meta = station_meta[st["stationId"]]
            st_p = s_meta["patrols"].get(pid, {})
            r_cells.append(_num_cell(float(st_p.get("score", 0.0)) * s_meta["weight"]))

        r_cells.append(_num_cell(float(p_obj.get("totalScore", 0.0))))
        summary_rows.append(f'<table:table-row>{"".join(r_cells)}</table:table-row>')

    sheets_xml_list.append(
        f'<table:table table:name="{summary_sheet_name}">{"".join(summary_rows)}</table:table>'
    )

    # ==========================================
    # 2. BUILD STATION SHEETS (One tab per station)
    # ==========================================
    for st in station_breakdowns:
        s_meta = station_meta[st["stationId"]]
        st_rows = []

        st_title = f'{s_meta["rawName"]} - Station Scores'
        st_subtitle = f'Scoring mode: {mode_label}   |   Station weight: {s_meta["weight"]}'
        st_rows.append(f'<table:table-row>{_text_cell(st_title)}</table:table-row>')
        st_rows.append(f'<table:table-row>{_text_cell(st_subtitle)}</table:table-row>')
        st_rows.append('<table:table-row/>')

        h_cells = [
            _text_cell("Patrol"),
            _text_cell("Patrol #"),
            _text_cell("Troop(s)"),
            _text_cell("Station Score"),
            _text_cell("Weighted Contribution"),
        ]
        st_rows.append(f'<table:table-row>{"".join(h_cells)}</table:table-row>')

        for pid in patrol_order:
            st_p_entry = s_meta["patrols"].get(pid, {})
            p_summary = patrol_obj_map.get(pid, {})
            st_score = float(st_p_entry.get("score", 0.0))

            r_cells = [
                _text_cell(patrol_name_map[pid]),
                _text_cell(_patrol_number_text(st_p_entry) or _patrol_number_text(p_summary)),
                _text_cell(_patrol_troops_text(st_p_entry) or _patrol_troops_text(p_summary)),
                _num_cell(st_score),
                _num_cell(st_score * s_meta["weight"]),
            ]
            st_rows.append(f'<table:table-row>{"".join(r_cells)}</table:table-row>')

        sheets_xml_list.append(
            f'<table:table table:name="{s_meta["sheetName"]}">{"".join(st_rows)}</table:table>'
        )

    # ==========================================
    # 3. ASSEMBLE COMPLETE ODF XML DOCUMENT
    # ==========================================
    content_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
    xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
    xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
    xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
    xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:header:1.0"
    xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
    xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
    xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0"
    xmlns:math="http://www.w3.org/1998/Math/MathML"
    xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0"
    xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0"
    xmlns:oof="urn:oasis:names:tc:opendocument:xmlns:of:1.0"
    xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.0"
    office:version="1.2">
  <office:body>
    <office:spreadsheet>
      {"".join(sheets_xml_list)}
    </office:spreadsheet>
  </office:body>
</office:document-content>'''

    manifest_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>'''

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("mimetype", "application/vnd.oasis.opendocument.spreadsheet", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/manifest.xml", manifest_xml)
        zf.writestr("content.xml", content_xml)

    return buf.getvalue()
