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


class AttendanceReportCanvas(canvas.Canvas):
    """Custom ReportLab Canvas to draw header and page footer for Attendance Report."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def showPage(self):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(36, 20, "Night Runner — Event Attendance & Audit Report")
        page_num = self._pageNumber
        self.drawRightString(8.5 * inch - 36, 20, f"Page {page_num}")
        self.restoreState()

        super().showPage()


def generate_attendance_report_pdf(
    event_name: str,
    troops_data: List[Dict[str, Any]],
    audit_logs: Optional[List[Dict[str, Any]]] = None,
) -> bytes:
    """
    Generates a PDF bytes buffer for the Event Attendance Report.

    Structure:
    - Grouped by Troop (sorted by troop number)
    - Within each troop:
      - Adults section (alphabetical by last_name, first_name)
      - Youth section (alphabetical by last_name, first_name)
    - Attendees display: Name, Category, Member ID, Phone, Primary Email, Secondary Email, EC1, EC2, Arrival Status
    - If attendee has audit trail changes recorded, a subsection lists all field changes (field_name, old_value -> new_value, timestamp).
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
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#4a5568"),
        alignment=1,
        spaceAfter=14,
    )

    troop_title_style = ParagraphStyle(
        "PDFTroopTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#2b6cb0"),
        spaceBefore=14,
        spaceAfter=6,
    )

    group_heading_style = ParagraphStyle(
        "PDFGroupHeading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#2d3748"),
        spaceBefore=8,
        spaceAfter=4,
    )

    table_header_style = ParagraphStyle(
        "PDFTableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "PDFTableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#2d3748"),
    )

    audit_heading_style = ParagraphStyle(
        "PDFAuditHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#c53030"),
    )

    audit_cell_style = ParagraphStyle(
        "PDFAuditCell",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#742a2a"),
    )

    story = []

    # 1. Document Header
    story.append(Paragraph("NIGHT RUNNER", header_style))
    story.append(Paragraph(f"EVENT ATTENDANCE REPORT — {event_name.upper()}", title_style))
    story.append(Paragraph("Official Roster Check-in & Audit Log Record", subtitle_style))
    story.append(Spacer(1, 4))

    # Map audit logs by attendee_id
    audit_map: Dict[str, List[Dict[str, Any]]] = {}
    for log in audit_logs or []:
        att_id = log.get("attendeeId") or log.get("attendee_id")
        if att_id:
            audit_map.setdefault(att_id, []).append(log)

    # Sort troops by troop number
    sorted_troops = sorted(
        troops_data,
        key=lambda t: (t.get("troopNumber") or t.get("number") or "")
    )

    for troop in sorted_troops:
        troop_num = troop.get("troopNumber") or troop.get("number") or "Unassigned"
        troop_attendees = troop.get("attendees") or []

        # Split into Adults and Youth
        adults = [a for a in troop_attendees if a.get("category") == "Adult"]
        youth = [a for a in troop_attendees if a.get("category") != "Adult"]

        # Sort alphabetically by last_name, first_name
        def name_key(a):
            last = a.get("lastName") or a.get("last_name") or ""
            first = a.get("firstName") or a.get("first_name") or ""
            return (last.lower(), first.lower())

        sorted_adults = sorted(adults, key=name_key)
        sorted_youth = sorted(youth, key=name_key)

        troop_elements = []
        troop_elements.append(Paragraph(f"Troop {troop_num}", troop_title_style))

        def build_attendee_table(group_name: str, attendees_list: List[Dict[str, Any]]):
            if not attendees_list:
                return

            troop_elements.append(Paragraph(f"{group_name} ({len(attendees_list)})", group_heading_style))

            col_widths = [1.3 * inch, 0.9 * inch, 1.4 * inch, 1.7 * inch, 1.3 * inch, 0.9 * inch]

            table_data = [
                [
                    Paragraph("Name", table_header_style),
                    Paragraph("Member ID", table_header_style),
                    Paragraph("Contact Phone / Emails", table_header_style),
                    Paragraph("Emergency Contacts", table_header_style),
                    Paragraph("Status", table_header_style),
                    Paragraph("YPT", table_header_style),
                ]
            ]

            for a in attendees_list:
                last_name = a.get("lastName") or a.get("last_name") or ""
                first_name = a.get("firstName") or a.get("first_name") or ""
                name_fmt = f"<b>{last_name}</b>, {first_name}"

                member_id = a.get("memberId") or a.get("member_id") or "—"
                phone = a.get("phone") or "—"
                p_email = a.get("primaryEmail") or a.get("primary_email") or ""
                s_email = a.get("secondaryEmail") or a.get("secondary_email") or ""

                contact_parts = [f"Ph: {phone}"]
                if p_email:
                    contact_parts.append(f"P: {p_email}")
                if s_email:
                    contact_parts.append(f"S: {s_email}")
                contact_str = "<br/>".join(contact_parts)

                ec1 = a.get("emergencyContact1") or a.get("emergency_contact_1") or ""
                ec2 = a.get("emergencyContact2") or a.get("emergency_contact_2") or ""
                ec_parts = []
                if ec1:
                    ec_parts.append(f"EC1: {ec1}")
                if ec2:
                    ec_parts.append(f"EC2: {ec2}")
                ec_str = "<br/>".join(ec_parts) if ec_parts else "—"

                arrival = a.get("arrival")
                status = a.get("status")
                if arrival:
                    status_str = "Checked In"
                elif status == "not_coming":
                    status_str = "Not Coming"
                else:
                    status_str = "Not Arrived"

                ypt_str = "✓" if a.get("youthProtectionCompleted") or a.get("youth_protection_completed") else "—"

                table_data.append([
                    Paragraph(name_fmt, table_cell_style),
                    Paragraph(str(member_id), table_cell_style),
                    Paragraph(contact_str, table_cell_style),
                    Paragraph(ec_str, table_cell_style),
                    Paragraph(status_str, table_cell_style),
                    Paragraph(ypt_str, table_cell_style),
                ])

                # Check for audit log edits
                att_id = a.get("id")
                att_audits = audit_map.get(att_id, [])
                if att_audits:
                    # Group audit changes by column index
                    # Col 0: Name (first_name, last_name, category)
                    # Col 1: Member ID (member_id)
                    # Col 2: Contact Phone / Emails (phone, primary_email, secondary_email)
                    # Col 3: Emergency Contacts (emergency_contact_1, emergency_contact_2)
                    # Col 4: Status (status, status_note)
                    # Col 5: YPT (youth_protection_completed)
                    col_changes: Dict[int, List[str]] = {0: [], 1: [], 2: [], 3: [], 4: [], 5: []}

                    field_display_names = {
                        "first_name": "First Name",
                        "last_name": "Last Name",
                        "category": "Category",
                        "member_id": "Member ID",
                        "phone": "Phone",
                        "primary_email": "Primary Email",
                        "secondary_email": "Secondary Email",
                        "emergency_contact_1": "EC1",
                        "emergency_contact_2": "EC2",
                        "status": "Status",
                        "status_note": "Status Note",
                        "youth_protection_completed": "YPT",
                        "troop_id": "Troop",
                    }

                    for entry in att_audits:
                        fname = entry.get("fieldName") or entry.get("field_name")
                        old_v = entry.get("oldValue") or entry.get("old_value") or "(none)"
                        new_v = entry.get("newValue") or entry.get("new_value") or "(none)"
                        label = field_display_names.get(fname, fname)
                        fmt_change = f"<b>{label}:</b><br/>'{old_v}' → '{new_v}'"

                        if fname in ("first_name", "last_name", "category", "troop_id"):
                            col_changes[0].append(fmt_change)
                        elif fname == "member_id":
                            col_changes[1].append(fmt_change)
                        elif fname in ("phone", "primary_email", "secondary_email"):
                            col_changes[2].append(fmt_change)
                        elif fname in ("emergency_contact_1", "emergency_contact_2"):
                            col_changes[3].append(fmt_change)
                        elif fname in ("status", "status_note"):
                            col_changes[4].append(fmt_change)
                        elif fname == "youth_protection_completed":
                            col_changes[5].append(fmt_change)
                        else:
                            col_changes[0].append(fmt_change)

                    audit_row = [
                        Paragraph("<br/>".join(col_changes[0]) if col_changes[0] else "", audit_cell_style),
                        Paragraph("<br/>".join(col_changes[1]) if col_changes[1] else "", audit_cell_style),
                        Paragraph("<br/>".join(col_changes[2]) if col_changes[2] else "", audit_cell_style),
                        Paragraph("<br/>".join(col_changes[3]) if col_changes[3] else "", audit_cell_style),
                        Paragraph("<br/>".join(col_changes[4]) if col_changes[4] else "", audit_cell_style),
                        Paragraph("<br/>".join(col_changes[5]) if col_changes[5] else "", audit_cell_style),
                    ]
                    table_data.append(audit_row)

            t = Table(table_data, colWidths=col_widths)
            t_style = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2b6cb0")),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]

            # Style audit rows with a subtle highlight background
            row_idx = 1
            for a in attendees_list:
                row_idx += 1
                att_id = a.get("id")
                if audit_map.get(att_id):
                    t_style.append(("BACKGROUND", (0, row_idx - 1), (-1, row_idx - 1), colors.HexColor("#fff5f5")))
                    row_idx += 1

            t.setStyle(TableStyle(t_style))
            troop_elements.append(t)
            troop_elements.append(Spacer(1, 8))

        build_attendee_table("Adults", sorted_adults)
        build_attendee_table("Youth", sorted_youth)

        story.append(KeepTogether(troop_elements))

    doc.build(story, canvasmaker=AttendanceReportCanvas)
    return buffer.getvalue()
