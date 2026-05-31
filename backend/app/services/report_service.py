"""
Report Service — generates a PDF screening report using ReportLab.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import io
from datetime import datetime
from app.models.models import ScreeningReport

RISK_COLORS = {
    "low": colors.HexColor("#1D9E75"),
    "medium": colors.HexColor("#EF9F27"),
    "high": colors.HexColor("#D85A30"),
    "critical": colors.HexColor("#E24B4A"),
}


async def generate_pdf_report(report: ScreeningReport) -> bytes:
    """Generate a PDF byte stream for the given screening report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ───────────────────────────────────────────
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=20, spaceAfter=4)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], fontSize=10, textColor=colors.gray)

    story.append(Paragraph("HR Candidate Screening Report", title_style))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')}", sub_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey, spaceAfter=12))

    # ── Risk Badge ────────────────────────────────────────
    risk = report.overall_risk or "low"
    risk_color = RISK_COLORS.get(risk, colors.gray)

    risk_table = Table(
        [[f"Overall Risk: {risk.upper()}"]],
        colWidths=[10 * cm],
    )
    risk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), risk_color),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 16))

    # ── Risk Scores Table ─────────────────────────────────
    story.append(Paragraph("Risk Category Scores", styles["Heading2"]))
    story.append(Spacer(1, 6))

    if report.risk_scores:
        score_data = [["Category", "Score", "Level"]]
        for cat, score in report.risk_scores.items():
            level = "Low" if score < 25 else "Medium" if score < 50 else "High" if score < 75 else "Critical"
            score_data.append([cat.replace("_", " ").title(), f"{score:.0f}/100", level])

        score_table = Table(score_data, colWidths=[8 * cm, 4 * cm, 4 * cm])
        score_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1EFE8")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAF9")]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(score_table)

    story.append(Spacer(1, 16))

    # ── AI Summary ────────────────────────────────────────
    story.append(Paragraph("AI Analysis Summary", styles["Heading2"]))
    story.append(Spacer(1, 6))
    summary_text = report.ai_summary or "No summary available."
    story.append(Paragraph(summary_text, styles["Normal"]))
    story.append(Spacer(1, 16))

    # ── Disclaimer ────────────────────────────────────────
    disclaimer_style = ParagraphStyle(
        "disclaimer", parent=styles["Normal"],
        fontSize=8, textColor=colors.gray, borderColor=colors.lightgrey,
        borderWidth=0.5, borderPadding=8, spaceAfter=0,
    )
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceBefore=8))
    story.append(Paragraph(
        "DISCLAIMER: This report is based solely on publicly available information collected with candidate consent. "
        "It is intended to supplement, not replace, human judgment in hiring decisions. This tool does not discriminate "
        "based on protected characteristics. All data processed in compliance with UU PDP (Indonesia) and applicable regulations.",
        disclaimer_style,
    ))

    doc.build(story)
    return buffer.getvalue()
