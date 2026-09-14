import io
import json
import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image as RLImage,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_patrol_qr_pdf(patrols: list, event_name: str = "Event Patrol Badges") -> bytes:
    """
    Generates a PDF bytes buffer containing portrait 1-page per patrol QR sheets.
    
    Each page contains:
    - Event Header & Title
    - Patrol Name, Patrol Number (or blank placeholder if unassigned)
    - Prominent Patrol QR Code (encoding patrol ID / barcode payload)
    - Patrol Members Table with columns: Name, Rank, Troop
    """
    buffer = io.BytesIO()
    
    # Standard portrait letter page: 8.5 x 11 inches
    # Margins: 0.5 inches
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
        fontSize=14,
        leading=16,
        textColor=colors.HexColor("#2b6cb0"),
        alignment=1,  # 1 = TA_CENTER
        spaceAfter=8,
    )
    
    patrol_name_style = ParagraphStyle(
        "PDFPatrolName",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#1a202c"),
        alignment=1, # Center
        spaceAfter=4,
    )
    
    patrol_meta_style = ParagraphStyle(
        "PDFPatrolMeta",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=16,
        textColor=colors.HexColor("#2d3748"),
        alignment=1, # Center
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
    
    if not patrols:
        # Single page stating no patrols
        story.append(Paragraph(event_name, header_style))
        story.append(Spacer(1, 0.5 * inch))
        story.append(Paragraph("No Patrols Found", patrol_name_style))
        doc.build(story)
        return buffer.getvalue()

    for idx, patrol in enumerate(patrols):
        page_elements = []
        
        # 1. Event Header
        page_elements.append(Paragraph(event_name.upper(), header_style))
        page_elements.append(Spacer(1, 4))
        
        # 2. Patrol Name
        p_name = patrol.name if getattr(patrol, "name", None) else "________________________"
        page_elements.append(Paragraph(p_name, patrol_name_style))
        
        # 3. Patrol Number
        p_num = str(patrol.number) if getattr(patrol, "number", None) is not None else "____"
        page_elements.append(Paragraph(f"Patrol #{p_num}", patrol_meta_style))
        page_elements.append(Spacer(1, 8))
        
        # 4. QR Code Generation (JSON payload with id and event matching frontend scanner)
        qr_payload = {
            "id": patrol.id if getattr(patrol, "id", None) else "UNKNOWN_PATROL",
            "event": event_name
        }
        qr_data = json.dumps(qr_payload)
        qr_img = qrcode.make(qr_data)
        img_buffer = io.BytesIO()
        qr_img.save(img_buffer, format="PNG")
        img_buffer.seek(0)
        
        # Prominent QR Code sizing (~ 3.5 inches x 3.5 inches)
        qr_element = RLImage(img_buffer, width=3.5 * inch, height=3.5 * inch)
        qr_element.hAlign = "CENTER"
        page_elements.append(qr_element)
        page_elements.append(Spacer(1, 14))
        
        # 5. Members Table
        members = getattr(patrol, "members", []) or []
        table_data = [
            [
                Paragraph("Member Name", table_header_style),
                Paragraph("Rank", table_header_style),
                Paragraph("Troop / Identifier", table_header_style),
            ]
        ]
        
        if members:
            for m in members:
                m_name = m.name if getattr(m, "name", None) else "—"
                m_rank = m.rank if getattr(m, "rank", None) else "—"
                m_troop = m.troop if getattr(m, "troop", None) else "—"
                table_data.append([
                    Paragraph(m_name, table_cell_style),
                    Paragraph(m_rank, table_cell_style),
                    Paragraph(m_troop, table_cell_style),
                ])
        else:
            # Provide blank member lines if no roster assigned yet
            for i in range(1, 7):
                table_data.append([
                    Paragraph(f"Member #{i}: __________________", table_cell_style),
                    Paragraph("___________", table_cell_style),
                    Paragraph("___________", table_cell_style),
                ])

        # Table Column Widths totaling 7.5 inches (8.5 - 1.0 margin)
        col_widths = [3.2 * inch, 2.0 * inch, 2.3 * inch]
        t = Table(table_data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2b6cb0")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
        ]))
        t.hAlign = "CENTER"
        
        page_elements.append(t)
        
        # Add to story with KeepTogether to ensure everything stays cleanly on 1 page per patrol
        story.append(KeepTogether(page_elements))
        
        if idx < len(patrols) - 1:
            story.append(PageBreak())
            
    doc.build(story)
    return buffer.getvalue()
