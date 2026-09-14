from __future__ import annotations

import html
import os
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "PROJECT_PLAN.md"
OUTPUT = ROOT / "output" / "pdf" / "Conference_Room_Booking_System_Project_Plan.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT = RIGHT = 1.65 * cm
TOP = 1.75 * cm
BOTTOM = 1.55 * cm
CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT


class Diagram(Flowable):
    """Compact vector diagrams, drawn as an indivisible flowable."""

    def __init__(self, kind: str):
        super().__init__()
        self.kind = kind
        self.height = {"architecture": 150, "usecase": 250, "erd": 375, "booking": 300, "clerk": 255}[kind]

    def wrap(self, avail_width, avail_height):
        return min(CONTENT_WIDTH, avail_width), self.height

    def _box(self, c, x, y, w, h, text, fill=colors.white, font=7.4):
        c.setFillColor(fill)
        c.setStrokeColor(colors.HexColor("#315b7d"))
        c.roundRect(x, y, w, h, 5, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#172b3a"))
        c.setFont("Helvetica", font)
        lines = text.split("\n")
        baseline = y + h / 2 + (len(lines) - 1) * font * 0.62
        for line in lines:
            c.drawCentredString(x + w / 2, baseline, line)
            baseline -= font * 1.25

    def _arrow(self, c, x1, y1, x2, y2):
        c.setStrokeColor(colors.HexColor("#4e718c"))
        c.setFillColor(colors.HexColor("#4e718c"))
        c.setLineWidth(1)
        c.line(x1, y1, x2, y2)
        angle = __import__("math").atan2(y2 - y1, x2 - x1)
        s = 5
        for delta in (2.6, -2.6):
            c.line(x2, y2, x2 - s * __import__("math").cos(angle + delta), y2 - s * __import__("math").sin(angle + delta))

    def _node(self, c, y, label, shape="box"):
        w, h = 270, 24
        x = (CONTENT_WIDTH - w) / 2
        if shape == "diamond":
            c.setFillColor(colors.HexColor("#fff4ce"))
            c.setStrokeColor(colors.HexColor("#a66c00"))
            p = c.beginPath(); p.moveTo(x + w / 2, y + h); p.lineTo(x + w, y + h / 2); p.lineTo(x + w / 2, y); p.lineTo(x, y + h / 2); p.close()
            c.drawPath(p, fill=1, stroke=1)
        else:
            self._box(c, x, y, w, h, label, colors.HexColor("#eaf3f8"))
        return x, y, w, h

    def draw(self):
        c = self.canv
        if self.kind == "architecture":
            nodes = [(8, 104, 100, 28, "Employee\nmobile app"), (8, 48, 100, 28, "Clerk / manager\nweb app"), (190, 76, 120, 36, "Express REST API"), (385, 104, 110, 28, "Authentication\nand role checks"), (385, 48, 110, 28, "Booking and\nreporting services"), (505, 76, 78, 36, "PostgreSQL\nPrisma")]
            for x, y, w, h, t in nodes: self._box(c, x, y, w, h, t, colors.HexColor("#eaf3f8"))
            for a, b in ((nodes[0], nodes[2]), (nodes[1], nodes[2]), (nodes[2], nodes[3]), (nodes[2], nodes[4]), (nodes[3], nodes[5]), (nodes[4], nodes[5])):
                self._arrow(c, a[0]+a[2], a[1]+a[3]/2, b[0], b[1]+b[3]/2)
        elif self.kind == "usecase":
            c.setStrokeColor(colors.HexColor("#315b7d")); c.setFillColor(colors.HexColor("#f7fbfe")); c.roundRect(110, 12, 365, 225, 8, fill=1, stroke=1)
            c.setFillColor(colors.HexColor("#172b3a")); c.setFont("Helvetica-Bold", 8); c.drawCentredString(292, 222, "Conference Room Booking System")
            left = ["Register / sign in", "Manage profile and history", "Search available rooms", "Create / cancel booking"]
            right = ["Manage rooms / amenities", "Manage consumable stock", "Prepare and update bookings", "View availability and reports"]
            for i, text in enumerate(left): self._box(c, 135, 178-i*42, 150, 23, text, colors.white)
            for i, text in enumerate(right): self._box(c, 302, 178-i*42, 150, 23, text, colors.white)
            c.setFont("Helvetica-Bold", 9); c.drawString(10, 165, "Employee"); c.drawString(486, 165, "Office manager"); c.drawString(486, 100, "Office clerk")
            for i in range(4): self._arrow(c, 85, 168-i*28, 135, 189-i*42)
            for i in (0, 1, 3): self._arrow(c, 486, 168-i*28, 452, 189-i*42)
            self._arrow(c, 486, 100, 452, 105)
        elif self.kind == "erd":
            boxes = [
                (4, 300, "USER", "id, name, email, role\ndepartment, contact"), (180, 300, "ROOM", "id, name, capacity\nstatus, isActive"), (356, 300, "AMENITY", "id, name, description"),
                (4, 200, "BOOKING", "employeeId, startAt, endAt\npurpose, status, preparedById"), (180, 200, "BOOKING_ROOM", "bookingId, roomId\nroomStatus"), (356, 200, "ROOM_AMENITY", "roomId, amenityId"),
                (4, 100, "CONSUMABLE_ITEM", "name, quantityOnHand\nreorderLevel"), (180, 100, "STOCK_ADJUSTMENT", "itemId, adjustedById\nquantityChange, reason"), (356, 100, "BOOKING_AMENITY", "bookingId, amenityId"),
                (92, 18, "SESSION / REFRESH_TOKEN", "userId, tokenHash / jwtId\nexpiresAt, revoked"),
            ]
            for x, y, title, body in boxes:
                self._box(c, x, y, 150, 48, title + "\n" + body, colors.HexColor("#f9fcff"), 6.4)
            lines = [((79,300),(79,248)), ((255,300),(255,248)), ((431,300),(431,248)), ((79,200),(79,148)), ((255,200),(255,148)), ((431,200),(431,148)), ((79,100),(255,148)), ((255,100),(79,148)), ((431,100),(255,148)), ((79,300),(167,66))]
            for (x1,y1),(x2,y2) in lines: self._arrow(c,x1,y1,x2,y2)
            c.setFont("Helvetica-Oblique", 6.5); c.setFillColor(colors.HexColor("#4b6273")); c.drawString(4, 365, "Relationship lines are simplified; foreign keys are listed in each entity.")
        else:
            booking = self.kind == "booking"
            labels = (["Employee signs in", "Enter date, time, capacity and amenities", "Search compatible rooms", "Select rooms and purpose", "Re-check availability in one transaction", "Create confirmed booking", "Notify clerk and show confirmation"] if booking else ["Clerk opens confirmed booking queue", "View booking rooms, purpose and amenities", "Prepare rooms and required amenities", "Set booking to READY", "Meeting takes place", "Set booking to COMPLETED", "Keep history for reporting"])
            top = self.height - 28
            previous = None
            for i, label in enumerate(labels):
                y = top - i * 38
                x, yy, w, h = self._node(c, y, label, "diamond" if booking and i == 4 else "box")
                if previous: self._arrow(c, previous[0]+previous[2]/2, previous[1], x+w/2, yy+h)
                previous = (x, yy, w, h)
            if booking:
                c.setFont("Helvetica-Oblique", 6.8); c.setFillColor(colors.HexColor("#4b6273")); c.drawString(7, 8, "If a room is no longer free, return the unavailable rooms and search again.")


def clean(text: str) -> str:
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = text.replace("**", "")
    return html.escape(text, quote=False).replace("&lt;font", "<font").replace("/font&gt;", "/font>").replace("&gt;", ">")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#b8c8d4")); canvas.line(LEFT, 1.05*cm, PAGE_WIDTH-RIGHT, 1.05*cm)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(colors.HexColor("#4b6273"))
    canvas.drawString(LEFT, 0.68*cm, "Conference Room Booking System - Project Plan")
    canvas.drawRightString(PAGE_WIDTH-RIGHT, 0.68*cm, f"Page {doc.page}")
    canvas.restoreState()


def table_flow(rows, styles):
    cells = [[Paragraph(clean(cell.strip()), styles["table"]) for cell in row] for row in rows]
    widths = [CONTENT_WIDTH / len(rows[0])] * len(rows[0])
    table = Table(cells, colWidths=widths, repeatRows=1, hAlign="LEFT", splitByRow=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#315b7d")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#aabdc9")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BACKGROUND", (0,1), (-1,-1), colors.HexColor("#f7fbfe")),
        ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    return table


def build_story():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="titlePage", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=colors.HexColor("#17324d"), alignment=TA_CENTER, spaceAfter=18))
    styles.add(ParagraphStyle(name="h1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=colors.HexColor("#17324d"), spaceBefore=14, spaceAfter=7, keepWithNext=True))
    styles.add(ParagraphStyle(name="h2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=colors.HexColor("#315b7d"), spaceBefore=10, spaceAfter=5, keepWithNext=True))
    styles.add(ParagraphStyle(name="body", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.8, leading=12.1, spaceAfter=5))
    styles.add(ParagraphStyle(name="bullet", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.7, leading=11.6, leftIndent=13, firstLineIndent=-8, spaceAfter=3))
    styles.add(ParagraphStyle(name="table", parent=styles["BodyText"], fontName="Helvetica", fontSize=6.8, leading=8.4))
    story = []
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    i = 0
    current_heading = ""
    diagram_map = {"Recommended solution shape": "architecture", "Use case diagram": "usecase", "Entity relationship design": "erd", "employee booking": "booking", "clerk preparation": "clerk"}
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            lang = line[3:].strip(); block = []; i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i]); i += 1
            if lang == "mermaid":
                kind = next((v for key, v in diagram_map.items() if key.lower() in current_heading.lower()), "architecture")
                story.append(Spacer(1, 3)); story.append(KeepTogether([Diagram(kind)])); story.append(Spacer(1, 7))
            else:
                code = "\n".join(block)
                story.append(Preformatted(code, ParagraphStyle("code", fontName="Courier", fontSize=6.9, leading=8.2, leftIndent=5, rightIndent=5, borderColor=colors.HexColor("#b8c8d4"), borderWidth=0.5, borderPadding=6, backColor=colors.HexColor("#f7fbfe"), spaceAfter=7)))
            i += 1; continue
        if line.startswith("# "):
            story.extend([Spacer(1, 125), Paragraph(clean(line[2:]), styles["titlePage"]), Paragraph("Implementation blueprint, diagrams, data model, and delivery plan", ParagraphStyle("subtitle", parent=styles["body"], alignment=TA_CENTER, textColor=colors.HexColor("#4b6273"))), Spacer(1, 14), Paragraph("Prepared from the Mini Project A brief", ParagraphStyle("source", parent=styles["body"], alignment=TA_CENTER)), PageBreak()])
        elif line.startswith("## "):
            current_heading = line[3:]
            story.append(Paragraph(clean(current_heading), styles["h1"]))
        elif line.startswith("### "):
            story.append(Paragraph(clean(line[4:]), styles["h2"]))
        elif line.startswith("| ") and i + 1 < len(lines) and re.match(r"^\|\s*-", lines[i+1]):
            rows = [[part.strip() for part in line.strip().strip("|").split("|")]]; i += 2
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([part.strip() for part in lines[i].strip().strip("|").split("|")]); i += 1
            story.extend([table_flow(rows, styles), Spacer(1, 8)]); continue
        elif re.match(r"^[-*] ", line):
            story.append(Paragraph("- " + clean(line[2:]), styles["bullet"]))
        elif re.match(r"^\d+\. ", line):
            story.append(Paragraph(clean(line), styles["bullet"]))
        elif line.strip():
            story.append(Paragraph(clean(line), styles["body"]))
        else:
            story.append(Spacer(1, 2))
        i += 1
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT, topMargin=TOP, bottomMargin=BOTTOM, title="Conference Room Booking System - Project Plan", author="MKMMADI 2026 TYP")
    doc.build(build_story(), onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
