import io
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


class WatermarkCanvas(canvas.Canvas):
    """Custom ReportLab Canvas to draw DRAFT watermark and page footer."""

    def __init__(self, *args, is_draft: bool = False, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_draft = is_draft

    def showPage(self):
        if self.is_draft:
            self.saveState()
            self.setFont("Helvetica-Bold", 54)
            self.setFillColor(colors.HexColor("#e2e8f0"), alpha=0.55)
            self.translate(4.25 * inch, 5.5 * inch)
            self.rotate(45)
            self.drawCentredString(0, 0, "DRAFT — PREVIEW ONLY")
            self.restoreState()

        # Page Footer
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(36, 20, "Night Runner — Event Scoring Report")
        page_num = self._pageNumber
        self.drawRightString(8.5 * inch - 36, 20, f"Page {page_num}")
        self.restoreState()

        super().showPage()


def _ordinal(n: int) -> str:
    """Formats an integer into an ordinal string e.g. 1 -> 1st, 2 -> 2nd."""
    if 11 <= (n % 100) <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def _patrol_number(p: Dict[str, Any]) -> str:
    """Renders a patrol number as '#12', or an em dash when unset."""
    num = p.get("patrolNumber")
    return f"#{num}" if num not in (None, "") else "—"


def _patrol_troops(p: Dict[str, Any]) -> str:
    """Renders the troop(s) a patrol's members belong to, or an em dash when unknown."""
    troops = p.get("troops")
    if isinstance(troops, (list, tuple)):
        troops = ", ".join(str(t) for t in troops if t)
    return str(troops) if troops else "—"


def _assign_rankings(items: List[Dict[str, Any]], score_key: str = "score") -> List[Dict[str, Any]]:
    """Assigns ranks with standard competition ranking and tie flags (*).
    If 2 items tie for 1st: both get rank '1st*', next item gets rank '3rd'.
    """
    sorted_items = sorted(items, key=lambda x: float(x.get(score_key, 0.0)), reverse=True)
    if not sorted_items:
        return []

    # First pass: identify score frequency to mark ties
    score_counts: Dict[float, int] = {}
    for item in sorted_items:
        val = round(float(item.get(score_key, 0.0)), 4)
        score_counts[val] = score_counts.get(val, 0) + 1

    ranked = []
    current_rank = 1
    for idx, item in enumerate(sorted_items):
        val = round(float(item.get(score_key, 0.0)), 4)
        if idx > 0:
            prev_val = round(float(sorted_items[idx - 1].get(score_key, 0.0)), 4)
            if val != prev_val:
                current_rank = idx + 1

        is_tied = score_counts[val] > 1
        rank_str = f"{_ordinal(current_rank)}{'*' if is_tied else ''}"
        ranked.append({
            **item,
            "rank": current_rank,
            "rankStr": rank_str,
            "isTied": is_tied
        })

    return ranked


def generate_event_scoring_pdf(
    event_name: str,
    overall_patrols: List[Dict[str, Any]],
    station_breakdowns: Optional[List[Dict[str, Any]]] = None,
    is_draft: bool = False
) -> bytes:
    """Generates a PDF bytes buffer containing the Detailed Event Scoring Report.
    
    :param event_name: Display name of the event
    :param overall_patrols: List of dicts: [{patrolId, patrolName, patrolNumber, troops, totalScore, rank, rankStr}]
    :param station_breakdowns: List of station dicts: [{stationId, stationName, stationWeight, patrols: [{patrolId, patrolName, patrolNumber, troops, score}]}]
    :param is_draft: If True, overlay a DRAFT watermark across all pages.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        "PDFHeader",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=13,
        textColor=colors.HexColor("#2b6cb0"),
        alignment=1,
        spaceAfter=4,
    )

    title_style = ParagraphStyle(
        "PDFTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1a202c"),
        alignment=1,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "PDFSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=13,
        textColor=colors.HexColor("#e53e3e") if is_draft else colors.HexColor("#38a169"),
        alignment=1,
        spaceAfter=14,
    )

    section_title_style = ParagraphStyle(
        "PDFSectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#2d3748"),
        spaceBefore=12,
        spaceAfter=6,
    )

    table_header_style = ParagraphStyle(
        "PDFTableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "PDFTableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#2d3748"),
    )

    table_cell_bold = ParagraphStyle(
        "PDFTableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#1a202c"),
    )

    story = []

    # 1. Document Header
    story.append(Paragraph("NIGHT RUNNER", header_style))
    story.append(Paragraph(f"EVENT SCORING REPORT — {event_name.upper()}", title_style))
    status_label = "OFFICIAL FINAL SCORING REPORT" if not is_draft else "PREVIEW DRAFT REPORT (UNFINALIZED)"
    story.append(Paragraph(status_label, subtitle_style))
    story.append(Spacer(1, 4))

    # 2. Overall Summary Section
    story.append(Paragraph("🏆 Overall Event Score Summary", section_title_style))

    summary_ranked = _assign_rankings(overall_patrols, score_key="totalScore")
    
    summary_table_data = [
        [
            Paragraph("Rank", table_header_style),
            Paragraph("Patrol #", table_header_style),
            Paragraph("Patrol Name", table_header_style),
            Paragraph("Troop(s)", table_header_style),
            Paragraph("Final Overall Score", table_header_style),
        ]
    ]

    has_any_tie = any(p.get("isTied") for p in summary_ranked)

    for p in summary_ranked:
        rank_str = p.get("rankStr") or f"{p.get('rank', '—')}"
        name_str = p.get("patrolName") or f"Patrol {p.get('patrolId')}"
        score_val = float(p.get("totalScore", 0.0))
        score_str = f"{score_val:.2f}"
        
        row_style = table_cell_bold if p.get("rank") == 1 else table_cell_style
        summary_table_data.append([
            Paragraph(rank_str, row_style),
            Paragraph(_patrol_number(p), row_style),
            Paragraph(name_str, row_style),
            Paragraph(_patrol_troops(p), row_style),
            Paragraph(score_str, row_style),
        ])

    col_widths_summary = [0.8 * inch, 0.8 * inch, 2.7 * inch, 1.9 * inch, 1.3 * inch]
    t_summary = Table(summary_table_data, colWidths=col_widths_summary)
    t_summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2b6cb0")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
    ]))
    t_summary.hAlign = "CENTER"
    story.append(t_summary)

    if has_any_tie:
        tie_note = ParagraphStyle(
            "TieNote",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#718096"),
            spaceBefore=3,
        )
        story.append(Paragraph("* Indicates a tied score for this position.", tie_note))

    story.append(Spacer(1, 14))

    # 3. Per-Station Breakdown Sections
    if station_breakdowns:
        story.append(Paragraph("📍 Station Breakdown & Rankings", section_title_style))

        for st in station_breakdowns:
            st_name = st.get("stationName") or f"Station {st.get('stationId')}"
            st_weight = st.get("stationWeight")
            weight_label = f" (Weight: {st_weight})" if st_weight is not None and float(st_weight) != 1.0 else ""
            
            st_heading_style = ParagraphStyle(
                "StationHeader",
                parent=styles["Heading3"],
                fontName="Helvetica-Bold",
                fontSize=11,
                leading=13,
                textColor=colors.HexColor("#2c5282"),
                spaceBefore=8,
                spaceAfter=4,
            )

            station_elements = [
                Paragraph(f"{st_name}{weight_label}", st_heading_style)
            ]

            patrols_at_st = st.get("patrols", [])
            st_ranked = _assign_rankings(patrols_at_st, score_key="score")

            st_table_data = [
                [
                    Paragraph("Station Rank", table_header_style),
                    Paragraph("Patrol #", table_header_style),
                    Paragraph("Patrol Name", table_header_style),
                    Paragraph("Troop(s)", table_header_style),
                    Paragraph("Effective Score", table_header_style),
                ]
            ]

            if not st_ranked:
                st_table_data.append([
                    Paragraph("—", table_cell_style),
                    Paragraph("—", table_cell_style),
                    Paragraph("No scores recorded for this station", table_cell_style),
                    Paragraph("—", table_cell_style),
                    Paragraph("—", table_cell_style),
                ])
            else:
                for p in st_ranked:
                    rank_str = p.get("rankStr") or f"{p.get('rank', '—')}"
                    name_str = p.get("patrolName") or f"Patrol {p.get('patrolId')}"
                    score_val = float(p.get("score", 0.0))
                    score_str = f"{score_val:.2f}"
                    st_table_data.append([
                        Paragraph(rank_str, table_cell_style),
                        Paragraph(_patrol_number(p), table_cell_style),
                        Paragraph(name_str, table_cell_style),
                        Paragraph(_patrol_troops(p), table_cell_style),
                        Paragraph(score_str, table_cell_style),
                    ])

            t_st = Table(st_table_data, colWidths=col_widths_summary)
            t_st.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a5568")),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
            ]))
            t_st.hAlign = "CENTER"
            station_elements.append(t_st)
            station_elements.append(Spacer(1, 8))

            story.append(KeepTogether(station_elements))

    # Build PDF with custom canvas for draft watermark and page footers
    def canvas_maker(*args, **kwargs):
        return WatermarkCanvas(*args, is_draft=is_draft, **kwargs)

    doc.build(story, canvasmaker=canvas_maker)
    return buffer.getvalue()
