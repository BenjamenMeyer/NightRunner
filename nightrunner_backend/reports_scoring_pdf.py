import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_event_scoring_pdf(event_name: str, patrols: list) -> bytes:
    """
    Generates a PDF bytes buffer containing the Final Scoring Report.
    patrols is a list of dicts: [{rank, patrolName, eventTotal, stationTotals: {stationId: score}}]
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
        fontSize=12,
        leading=14,
        textColor=colors.HexColor("#2b6cb0"),
        alignment=1,
        spaceAfter=4,
    )

    title_style = ParagraphStyle(
        "PDFTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1a202c"),
        alignment=1,
        spaceAfter=12,
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

    story = []

    story.append(Paragraph("NIGHT RUNNER", header_style))
    story.append(Paragraph(f"FINAL SCORING REPORT — {event_name.upper()}", title_style))
    story.append(Spacer(1, 10))

    table_data = [
        [
            Paragraph("Rank", table_header_style),
            Paragraph("Patrol Name", table_header_style),
            Paragraph("Total Score", table_header_style),
        ]
    ]

    for p in patrols:
        rank_str = f"#{p.get('rank', '—')}"
        name_str = p.get("patrolName") or f"Patrol {p.get('patrolId')}"
        score_str = f"{p.get('eventTotal', 0.0):.2f}"
        table_data.append([
            Paragraph(rank_str, table_cell_style),
            Paragraph(name_str, table_cell_style),
            Paragraph(score_str, table_cell_style),
        ])

    col_widths = [1.2 * inch, 4.3 * inch, 2.0 * inch]
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
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
    t.hAlign = "CENTER"

    story.append(t)
    doc.build(story)
    return buffer.getvalue()
