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


# Sheet layout, 0-indexed columns.
# Event Summary: A Rank | B Patrol # | C Patrol | D Troop(s) | E.. Stations | Final Score
SUMMARY_STATION_START_COL = 4
# Station sheet: A Patrol | B Patrol # | C Troop(s) | D Raw Total | E Effective | F.. Tasks
STATION_TASK_START_COL = 5
STATION_RAW_TOTAL_COL = "D"
STATION_EFFECTIVE_COL = "E"


def generate_event_scoring_ods(
    event_name: str,
    overall_patrols: List[Dict[str, Any]],
    station_breakdowns: Optional[List[Dict[str, Any]]] = None,
    scoring_mode: str = "absolute"
) -> bytes:
    """Generates an OpenDocument Spreadsheet (.ods) workbook containing Event Summary and Station sheets.
    
    Uses OpenFormula standard formulas to dynamically calculate station totals, weighted scores, and event grand totals.
    
    :param event_name: Display name of the event
    :param overall_patrols: List of patrol dicts [{patrolId, patrolName, patrolNumber, troops, totalScore, rank, rankStr}]
    :param station_breakdowns: List of station dicts [{stationId, stationName, stationWeight, tasks: [...], patrols: [...]}]
    :param scoring_mode: "absolute" or "relative"
    """
    station_breakdowns = station_breakdowns or []
    
    # Sort overall patrols by score descending to match standard presentation
    sorted_patrols = sorted(overall_patrols, key=lambda p: float(p.get("totalScore", 0.0)), reverse=True)
    patrol_order = [p["patrolId"] for p in sorted_patrols]
    patrol_name_map = {p["patrolId"]: p.get("patrolName", f"Patrol {p['patrolId']}") for p in sorted_patrols}
    patrol_obj_map = {p["patrolId"]: p for p in sorted_patrols}

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
            "tasks": st.get("tasks", []),
            "patrols": {p["patrolId"]: p for p in st.get("patrols", [])}
        }

    # ==========================================
    # 1. BUILD EVENT SUMMARY SHEET
    # ==========================================
    summary_sheet_name = "Event Summary"
    summary_rows = []

    # Title row
    summary_rows.append(
        f'<table:table-row>'
        f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(event_name)} — Event Score Summary</text:p></table:table-cell>'
        f'</table:table-row>'
    )
    # Empty spacing row
    summary_rows.append('<table:table-row/>')

    # Header Row 1: Titles
    h1_cells = [
        '<table:table-cell office:value-type="string"><text:p>Rank</text:p></table:table-cell>',
        '<table:table-cell office:value-type="string"><text:p>Patrol #</text:p></table:table-cell>',
        '<table:table-cell office:value-type="string"><text:p>Patrol</text:p></table:table-cell>',
        '<table:table-cell office:value-type="string"><text:p>Troop(s)</text:p></table:table-cell>'
    ]
    for st in station_breakdowns:
        s_meta = station_meta[st["stationId"]]
        h1_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(s_meta["rawName"])}</text:p></table:table-cell>')
    h1_cells.append('<table:table-cell office:value-type="string"><text:p>Final Score</text:p></table:table-cell>')
    summary_rows.append(f'<table:table-row>{"".join(h1_cells)}</table:table-row>')

    # Header Row 2: Station Weight Multipliers
    h2_cells = [
        '<table:table-cell office:value-type="string"><text:p></text:p></table:table-cell>',
        '<table:table-cell office:value-type="string"><text:p></text:p></table:table-cell>',
        '<table:table-cell office:value-type="string"><text:p></text:p></table:table-cell>',
        '<table:table-cell office:value-type="string"><text:p>Station Weight</text:p></table:table-cell>'
    ]
    for st in station_breakdowns:
        s_meta = station_meta[st["stationId"]]
        h2_cells.append(f'<table:table-cell office:value-type="float" office:value="{s_meta["weight"]}"><text:p>{s_meta["weight"]}</text:p></table:table-cell>')
    h2_cells.append('<table:table-cell office:value-type="string"><text:p>Grand Total Sum</text:p></table:table-cell>')
    summary_rows.append(f'<table:table-row>{"".join(h2_cells)}</table:table-row>')

    # Header Row 3: Max Station Achieved (for relative scaling reference or max check)
    # Data rows start at row index 6 (1-based: row 6 for first patrol)
    # Row index tracking for OpenFormula references:
    # Row 1: Title
    # Row 2: Empty
    # Row 3: Header Row 1 (Rank, Patrol #, Patrol, Troop(s), [Stations...], Final Score)
    # Row 4: Header Row 2 (Station Weights)
    # Row 5: Empty separator
    summary_rows.append('<table:table-row/>')

    data_start_row = 6
    num_patrols = len(patrol_order)
    data_end_row = data_start_row + num_patrols - 1

    for p_idx, pid in enumerate(patrol_order):
        row_num = data_start_row + p_idx
        p_name = patrol_name_map[pid]
        p_obj = next((p for p in sorted_patrols if p["patrolId"] == pid), {})
        cached_final_score = float(p_obj.get("totalScore", 0.0))

        r_cells = []

        # Column A: Rank. Placeholder formula; rewritten below once the final
        # score column is known.
        r_cells.append(f'<table:table-cell office:value-type="float" office:value="{p_idx + 1}"><text:p>{p_idx + 1}</text:p></table:table-cell>')

        # Column B: Patrol Number
        p_num_text = _patrol_number_text(patrol_obj_map.get(pid, {}))
        r_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(p_num_text)}</text:p></table:table-cell>')

        # Column C: Patrol Name
        r_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(p_name)}</text:p></table:table-cell>')

        # Column D: Troop(s) the patrol members belong to
        p_troops_text = _patrol_troops_text(patrol_obj_map.get(pid, {}))
        r_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(p_troops_text)}</text:p></table:table-cell>')

        # Station Columns (Column C, D, ...): OpenFormula reference to Station Sheet total * Station Weight
        st_ref_cols = []
        for s_idx, st in enumerate(station_breakdowns):
            s_id = st["stationId"]
            s_meta = station_meta[s_id]
            col_letter = _col_to_letter(SUMMARY_STATION_START_COL + s_idx)
            st_ref_cols.append(col_letter)

            # Find row number of this patrol in station sheet
            # Station sheet has header rows: Row 1 Title, Row 2 Header, Row 3 Data start
            st_patrol_row = 3 + p_idx
            
            # OpenFormula cross-sheet cell reference: $'Station Sheet Name'.[Cell]
            sheet_escaped = s_meta['sheetName'].replace("'", "''")
            st_cell_ref = f"${sheet_escaped}.{STATION_EFFECTIVE_COL}{st_patrol_row}"
            st_weight_ref = f"[.{col_letter}$4]" # Weight is on summary row 4

            st_formula = f'of:=[{st_cell_ref}]*[{st_weight_ref}]'
            
            # Fetch cached station score for value fallback
            cached_st_p = s_meta["patrols"].get(pid, {})
            cached_st_score = float(cached_st_p.get("score", 0.0)) * s_meta["weight"]

            r_cells.append(
                f'<table:table-cell table:formula="{st_formula}" office:value-type="float" office:value="{cached_st_score}">'
                f'<text:p>{round(cached_st_score, 2)}</text:p>'
                f'</table:table-cell>'
            )

        # Final Score Column: SUM of weighted station scores for this patrol
        first_st_col = _col_to_letter(SUMMARY_STATION_START_COL)
        last_st_col = _col_to_letter(SUMMARY_STATION_START_COL + len(station_breakdowns) - 1)
        final_formula = f'of:=SUM([.{first_st_col}{row_num}:.{last_st_col}{row_num}])'

        final_col_letter = _col_to_letter(SUMMARY_STATION_START_COL + len(station_breakdowns))
        # Update rank formula to point to exact final score column
        rank_formula = f'of:=RANK([.{final_col_letter}{row_num}];[.{final_col_letter}${data_start_row}:.{final_col_letter}${data_end_row}];0)'
        r_cells[0] = f'<table:table-cell table:formula="{rank_formula}" office:value-type="float" office:value="{p_idx + 1}"><text:p>{p_idx + 1}</text:p></table:table-cell>'

        r_cells.append(
            f'<table:table-cell table:formula="{final_formula}" office:value-type="float" office:value="{cached_final_score}">'
            f'<text:p>{round(cached_final_score, 2)}</text:p>'
            f'</table:table-cell>'
        )

        summary_rows.append(f'<table:table-row>{"".join(r_cells)}</table:table-row>')

    summary_table_xml = (
        f'<table:table table:name="{summary_sheet_name}">'
        f'{"".join(summary_rows)}'
        f'</table:table>'
    )
    sheets_xml_list.append(summary_table_xml)

    # ==========================================
    # 2. BUILD STATION SHEETS (One tab per station)
    # ==========================================
    for st in station_breakdowns:
        s_id = st["stationId"]
        s_meta = station_meta[s_id]
        st_sheet_name = s_meta["sheetName"]
        tasks = st.get("tasks", [])
        
        st_rows = []

        # Title Row
        st_rows.append(
            f'<table:table-row>'
            f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(s_meta["rawName"])} — Station Scores</text:p></table:table-cell>'
            f'</table:table-row>'
        )

        # Header Row: Patrol | Patrol # | Troop(s) | Raw Total | Station Score | [Task 1, Task 2...]
        h_cells = [
            '<table:table-cell office:value-type="string"><text:p>Patrol</text:p></table:table-cell>',
            '<table:table-cell office:value-type="string"><text:p>Patrol #</text:p></table:table-cell>',
            '<table:table-cell office:value-type="string"><text:p>Troop(s)</text:p></table:table-cell>',
            '<table:table-cell office:value-type="string"><text:p>Raw Total</text:p></table:table-cell>',
            '<table:table-cell office:value-type="string"><text:p>Effective Station Score</text:p></table:table-cell>'
        ]
        for t_idx, t in enumerate(tasks):
            t_name = t.get("name") or f"Task {t_idx + 1}"
            h_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(t_name)}</text:p></table:table-cell>')
        
        if not tasks:
            h_cells.append('<table:table-cell office:value-type="string"><text:p>Score</text:p></table:table-cell>')

        st_rows.append(f'<table:table-row>{"".join(h_cells)}</table:table-row>')

        # Data Rows (Data starts at row 3)
        st_data_start_row = 3
        st_data_end_row = st_data_start_row + num_patrols - 1

        for p_idx, pid in enumerate(patrol_order):
            row_num = st_data_start_row + p_idx
            p_name = patrol_name_map[pid]
            st_p_entry = s_meta["patrols"].get(pid, {})
            cached_st_score = float(st_p_entry.get("score", 0.0))

            r_cells = []
            # Column A: Patrol Name
            r_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(p_name)}</text:p></table:table-cell>')

            # Columns B and C: patrol identity. Prefer the station row, fall back
            # to the summary row, which always carries it.
            p_summary = patrol_obj_map.get(pid, {})

            p_num_text = _patrol_number_text(st_p_entry) or _patrol_number_text(p_summary)
            r_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(p_num_text)}</text:p></table:table-cell>')

            # Troop(s) the patrol members belong to
            p_troops_text = _patrol_troops_text(st_p_entry) or _patrol_troops_text(p_summary)
            r_cells.append(f'<table:table-cell office:value-type="string"><text:p>{_escape_xml(p_troops_text)}</text:p></table:table-cell>')

            # Column D: Raw Total (SUM of the task columns if tasks exist)
            if tasks:
                first_task_col = _col_to_letter(STATION_TASK_START_COL)
                last_task_col = _col_to_letter(STATION_TASK_START_COL + len(tasks) - 1)
                raw_formula = f'of:=SUM([.{first_task_col}{row_num}:.{last_task_col}{row_num}])'
                r_cells.append(
                    f'<table:table-cell table:formula="{raw_formula}" office:value-type="float" office:value="{cached_st_score}">'
                    f'<text:p>{round(cached_st_score, 2)}</text:p>'
                    f'</table:table-cell>'
                )
            else:
                r_cells.append(
                    f'<table:table-cell table:formula="of:=[.{_col_to_letter(STATION_TASK_START_COL)}{row_num}]" office:value-type="float" office:value="{cached_st_score}">'
                    f'<text:p>{round(cached_st_score, 2)}</text:p>'
                    f'</table:table-cell>'
                )

            # Column E: Effective Station Score, floored at zero
            eff_formula = f'of:=MAX(0;[.{STATION_RAW_TOTAL_COL}{row_num}])'
            r_cells.append(
                f'<table:table-cell table:formula="{eff_formula}" office:value-type="float" office:value="{cached_st_score}">'
                f'<text:p>{round(cached_st_score, 2)}</text:p>'
                f'</table:table-cell>'
            )

            # Column F onwards: Task Scores
            if tasks:
                task_breakdown = st_p_entry.get("breakdown") or []
                t_score_map = {}
                if isinstance(task_breakdown, list):
                    for tb in task_breakdown:
                        if isinstance(tb, dict):
                            t_score_map[tb.get("taskId")] = float(tb.get("rawScore", 0.0))
                
                for t in tasks:
                    t_id = t.get("id") or t.get("_id")
                    t_val = t_score_map.get(t_id, 0.0)
                    r_cells.append(
                        f'<table:table-cell office:value-type="float" office:value="{t_val}">'
                        f'<text:p>{t_val}</text:p>'
                        f'</table:table-cell>'
                    )
            else:
                r_cells.append(
                    f'<table:table-cell office:value-type="float" office:value="{cached_st_score}">'
                    f'<text:p>{cached_st_score}</text:p>'
                    f'</table:table-cell>'
                )

            st_rows.append(f'<table:table-row>{"".join(r_cells)}</table:table-row>')

        st_table_xml = (
            f'<table:table table:name="{st_sheet_name}">'
            f'{"".join(st_rows)}'
            f'</table:table>'
        )
        sheets_xml_list.append(st_table_xml)

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
