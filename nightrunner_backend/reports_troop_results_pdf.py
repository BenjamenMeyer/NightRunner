import io
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

MODE_NOTES = {
    "relative": (
        "Each station is scored out of 10. The patrol with the most points at a "
        "station gets 10, and every other patrol gets a share of 10 in proportion "
        "to its points there."
    ),
    "absolute": "Each station score is the points the patrol earned at that station.",
}
TOTAL_NOTE = (
    "The overall score adds up the station scores. Where a station counts more "
    "than once, its score is multiplied before it is added."
)


class _FooterCanvas(canvas.Canvas):
    def showPage(self):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(36, 20, "Night Runner — Patrol Results")
        self.drawRightString(8.5 * inch - 36, 20, f"Page {self._pageNumber}")
        self.restoreState()
        super().showPage()


def _score(value: Optional[float]) -> str:
    return f"{float(value):.2f}" if value is not None else "—"


def _weight_note(weight: float) -> str:
    if weight == 1.0:
        return ""
    return f" (counts ×{weight:g})"


def _p(text: Any, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(str(text)), style)


def generate_troop_results_pdf(
    event_name: str,
    troop: Dict[str, Any],
    scoring_mode: str = "absolute",
) -> bytes:
    """One cover page listing the troop's patrols, then one page per patrol.

    :param troop: one entry from `troop_results.build_troop_results`.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=40,
    )
    styles = getSampleStyleSheet()
    eyebrow = ParagraphStyle("Eyebrow", parent=styles["Normal"], fontName="Helvetica-Bold",
                             fontSize=10, textColor=colors.HexColor("#2b6cb0"), alignment=1)
    title = ParagraphStyle("Title", parent=styles["Heading1"], fontName="Helvetica-Bold",
                           fontSize=18, leading=22, textColor=colors.HexColor("#1a202c"),
                           alignment=1, spaceAfter=4)
    subtitle = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=11, leading=14,
                              textColor=colors.HexColor("#4a5568"), alignment=1, spaceAfter=12)
    body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=13,
                          textColor=colors.HexColor("#2d3748"))
    muted = ParagraphStyle("Muted", parent=body, fontSize=9, leading=12,
                           textColor=colors.HexColor("#718096"))
    big = ParagraphStyle("Big", parent=body, fontName="Helvetica-Bold", fontSize=14, leading=18,
                         textColor=colors.HexColor("#1a202c"), spaceBefore=6, spaceAfter=6)
    station_heading = ParagraphStyle("Station", parent=styles["Heading3"], fontName="Helvetica-Bold",
                                     fontSize=11, leading=14, textColor=colors.HexColor("#2c5282"),
                                     spaceBefore=10, spaceAfter=3)
    explanation = ParagraphStyle("Explanation", parent=body, fontName="Helvetica-Oblique",
                                 fontSize=9, leading=12, textColor=colors.HexColor("#4a5568"),
                                 spaceBefore=3)
    th = ParagraphStyle("TH", parent=body, fontName="Helvetica-Bold", textColor=colors.white)

    grid = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a5568")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
    ])

    troop_label = troop.get("troopLabel") or "Troop"
    patrols: List[Dict[str, Any]] = troop.get("patrols", [])
    story: List[Any] = []

    # Cover page: the troop leader's overview before handing sheets out.
    story.append(_p("NIGHT RUNNER", eyebrow))
    story.append(_p(f"{troop_label} — Results", title))
    story.append(_p(event_name, subtitle))
    cover_rows = [[_p("Patrol", th), _p("Overall rank", th), _p("Overall score", th)]]
    for p in patrols:
        num = p.get("patrolNumber")
        name = f"#{num} {p['patrolName']}" if num not in (None, "") else p["patrolName"]
        cover_rows.append([
            _p(name, body),
            _p(f"{p.get('overallRankStr') or '—'} of {p.get('patrolCount')}", body),
            _p(_score(p.get("overallScore")), body),
        ])
    cover = Table(cover_rows, colWidths=[3.6 * inch, 1.6 * inch, 1.6 * inch])
    cover.setStyle(grid)
    story.append(cover)
    story.append(Spacer(1, 10))
    story.append(_p(MODE_NOTES.get(scoring_mode, MODE_NOTES["absolute"]), muted))
    story.append(_p(TOTAL_NOTE, muted))
    story.append(_p("* means tied with another patrol.", muted))

    for p in patrols:
        story.append(PageBreak())
        num = p.get("patrolNumber")
        heading = f"Patrol #{num}: {p['patrolName']}" if num not in (None, "") else p["patrolName"]
        story.append(_p(event_name.upper(), eyebrow))
        story.append(_p(heading, title))
        if p.get("troops"):
            story.append(_p(f"Troop(s): {p['troops']}", subtitle))
        if p.get("members"):
            story.append(_p("Scouts: " + ", ".join(p["members"]), body))
        story.append(_p(
            f"Overall: {p.get('overallRankStr') or '—'} of {p.get('patrolCount')}, "
            f"{_score(p.get('overallScore'))} points",
            big,
        ))
        story.append(_p(MODE_NOTES.get(scoring_mode, MODE_NOTES["absolute"]), muted))

        for st in p.get("stations", []):
            block = [_p(f"{st['stationName']}{_weight_note(st['stationWeight'])}", station_heading)]

            if st.get("attempted") and st.get("entries"):
                rows = [[_p("What was recorded", th), _p("Entry", th)]]
                for e in st["entries"]:
                    text = e["text"] + (f" ({e['detail']})" if e.get("detail") else "")
                    rows.append([_p(e["task"], body), _p(text, body)])
                entries = Table(rows, colWidths=[4.2 * inch, 2.6 * inch])
                entries.setStyle(grid)
                block.append(entries)
            else:
                block.append(_p("Not scored at this station.", muted))

            summary = (
                f"Station score {_score(st.get('score'))}"
                f" · {st.get('rankStr') or '—'} of {p.get('patrolCount')}"
                f" · Average {_score(st.get('average'))}"
                f" · Best {_score(st.get('best'))}"
            )
            block.append(Spacer(1, 3))
            block.append(_p(summary, body))
            if st.get("explanation"):
                block.append(_p(f"How it was scored: {st['explanation']}", explanation))
            story.append(KeepTogether(block))

        story.append(Spacer(1, 8))
        story.append(_p("Average counts only patrols that were scored at the station. "
                        "* means tied with another patrol.", muted))

    doc.build(story, canvasmaker=_FooterCanvas)
    return buffer.getvalue()
