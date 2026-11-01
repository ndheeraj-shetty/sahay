"""
Script to generate the comprehensive SAHAY Hackathon Project Documentation in Microsoft Word (.docx) format.
Features:
- Professional styling with SAHAY brand colors (#0F4C81 Navy, #0EA5E9 Sky Blue, #1E293B Slate)
- Custom formatted tables with shaded headers, borders, and alternating rows
- 5 high-resolution screenshots embedded with captions
- In-depth, exhaustive documentation of all features, architectures, security, and AWS deployment
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Sets the background color of a table cell."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    """Sets internal padding/margins for a cell in twentieths of a point (dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    """Sets subtle light-slate borders for the entire table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="none"/><w:left w:val="none"/><w:right w:val="none"/></w:tblBorders>')
    tblPr.append(borders)

def add_heading_styled(doc, text, level):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Segoe UI"
    run.bold = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(22)
        p.paragraph_format.space_after = Pt(8)
        run.font.size = Pt(17)
        run.font.color.rgb = RGBColor(15, 76, 129) # Navy
        # Add a subtle bottom border or accent underline
    elif level == 2:
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        run.font.size = Pt(13.5)
        run.font.color.rgb = RGBColor(14, 116, 144) # Teal/Cyan
    elif level == 3:
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor(30, 41, 59) # Slate Dark
    return p

def add_callout(doc, title, text, bg_color="F0F9FF", border_color="0EA5E9"):
    """Adds an executive callout box."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(6.5)
    
    cell = table.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=160, bottom=160, left=200, right=180)
    
    # Left thick border
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(f"📌 {title}\n")
    run_title.font.name = "Segoe UI"
    run_title.bold = True
    run_title.font.size = Pt(10.5)
    run_title.font.color.rgb = RGBColor(15, 76, 129)
    
    run_body = p.add_run(text)
    run_body.font.name = "Segoe UI"
    run_body.font.size = Pt(9.5)
    run_body.font.color.rgb = RGBColor(51, 65, 85)
    
    # Spacing after callout table
    empty_p = doc.add_paragraph()
    empty_p.paragraph_format.space_before = Pt(0)
    empty_p.paragraph_format.space_after = Pt(6)

def add_body_p(doc, text, bold_prefix="", space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Segoe UI"
        r_pre.font.size = Pt(10)
        r_pre.bold = True
        r_pre.font.color.rgb = RGBColor(30, 41, 59)
    r = p.add_run(text)
    r.font.name = "Segoe UI"
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_bullet_item(doc, text, bold_title=""):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.12
    if bold_title:
        r_b = p.add_run(bold_title)
        r_b.font.name = "Segoe UI"
        r_b.font.size = Pt(10)
        r_b.bold = True
        r_b.font.color.rgb = RGBColor(30, 41, 59)
    r = p.add_run(text)
    r.font.name = "Segoe UI"
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def style_header_cell(cell, text, width_in=None):
    if width_in:
        cell.width = Inches(width_in)
    set_cell_background(cell, "0F4C81") # Primary Navy
    set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(text)
    run.font.name = "Segoe UI"
    run.font.size = Pt(9.5)
    run.bold = True
    run.font.color.rgb = RGBColor(255, 255, 255)

def style_data_cell(cell, text, is_even=False, width_in=None, bold_prefix="", text_color=(51, 65, 85)):
    if width_in:
        cell.width = Inches(width_in)
    bg = "F8FAFC" if is_even else "FFFFFF"
    set_cell_background(cell, bg)
    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.1
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Segoe UI"
        r_pre.font.size = Pt(9.0)
        r_pre.bold = True
        r_pre.font.color.rgb = RGBColor(30, 41, 59)
    run = p.add_run(text)
    run.font.name = "Segoe UI"
    run.font.size = Pt(9.0)
    run.font.color.rgb = RGBColor(*text_color)

def build_document():
    doc = Document()
    
    # Set standard 0.8 inch margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)
        
        # Add page numbering footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("SAHAY Life-Admin OS — Team BrainByte | Final Submission Documentation")
        f_run.font.name = "Segoe UI"
        f_run.font.size = Pt(8.5)
        f_run.font.color.rgb = RGBColor(148, 163, 184)
    
    # ==========================================
    # 1. COVER / TITLE SECTION
    # ==========================================
    p_badge = doc.add_paragraph()
    p_badge.paragraph_format.space_before = Pt(10)
    p_badge.paragraph_format.space_after = Pt(4)
    r_badge = p_badge.add_run("NATIONAL HACKATHON FINAL SUBMISSION  •  PRODUCTION READY  •  AWS CLOUD DEPLOYED")
    r_badge.font.name = "Segoe UI"
    r_badge.font.size = Pt(8.5)
    r_badge.bold = True
    r_badge.font.color.rgb = RGBColor(14, 165, 233) # Cyan
    
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("SAHAY: The Household Life-Admin OS")
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(24)
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(15, 76, 129) # Navy
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    r_sub = p_sub.add_run("One Unified, Zero-Knowledge Family Operating System for Indian Households with Dual-Engine Explainable Intelligence")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(11.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(71, 85, 105)
    
    # Project Metadata Table
    meta_table = doc.add_table(rows=7, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    set_table_borders(meta_table)
    
    metadata_rows = [
        ("Team Name", "BrainByte"),
        ("Team Lead & AI Development", "Nagasuri Venkata Satya Dheeraj (AI Models, Document Doctor, RAG Engine)"),
        ("Frontend & UI/UX Architecture", "Harshini Alamuru (React 19, Modern Light-Themed System Design)"),
        ("Backend & Security Layer", "Tarun Teja Nagula (FastAPI, PostgreSQL 35 Tables, AES-256 Client-Side Vault)"),
        ("Live Production AWS EC2 Link", "http://16.178.56.236/"),
        ("Interactive Swagger API Documentation", "http://16.178.56.236/docs"),
        ("Official GitHub Repository", "https://github.com/ndheeraj-shetty/sahay.git (Branch: main)"),
    ]
    
    col_widths = [2.2, 4.3]
    for i, (label, val) in enumerate(metadata_rows):
        c0 = meta_table.cell(i, 0)
        c1 = meta_table.cell(i, 1)
        style_data_cell(c0, label, is_even=(i % 2 == 1), width_in=col_widths[0], bold_prefix="", text_color=(15, 76, 129))
        c0.paragraphs[0].runs[0].bold = True
        style_data_cell(c1, val, is_even=(i % 2 == 1), width_in=col_widths[1], bold_prefix="", text_color=(15, 23, 42))
        if "http" in val:
            c1.paragraphs[0].runs[0].font.color.rgb = RGBColor(2, 132, 199)
            c1.paragraphs[0].runs[0].underline = True

    add_body_p(doc, "", space_after=10)
    
    add_callout(doc, "Executive Summary", 
        "SAHAY replaces the chaotic, high-stress fragmentation of household management in Indian families. "
        "Built on zero-knowledge client-side encryption (SAHAY Shield), automated document intelligence (Document Doctor), "
        "proactive obligation tracking (Sahay Daily), family health emergency readiness (Health Shield), and goal liquidation planning (Lakshya), "
        "SAHAY delivers an immutable, multi-generational household operating system. Fully deployed and verified on AWS EC2.",
        bg_color="F0F9FF", border_color="0EA5E9"
    )

    # ==========================================
    # 2. PROJECT OVERVIEW & PROBLEM STATEMENT
    # ==========================================
    add_heading_styled(doc, "1. Project Overview & Problem Statement", level=1)
    
    add_body_p(doc, 
        "In modern Indian households, managing administrative, legal, health, and financial life events is fragmented, "
        "anxiety-inducing, and vulnerable to catastrophic oversight. While enterprise workplace collaboration has evolved "
        "with tools like Slack, Notion, and Jira, Indian households remain reliant on unstructured WhatsApp threads, lost physical folders, "
        "and disjointed single-purpose utility portals."
    )
    
    add_heading_styled(doc, "1.1 The Quantitative Household Crisis in India", level=2)
    
    # Problem comparison table
    prob_table = doc.add_table(rows=5, cols=3)
    prob_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    prob_table.autofit = False
    set_table_borders(prob_table)
    
    headers = ["Household Life Domain", "Conventional Reality / Pain Point", "Impact & Critical Vulnerability"]
    for j, h in enumerate(headers):
        style_header_cell(prob_table.cell(0, j), h, [1.8, 2.3, 2.4][j])
        
    prob_rows = [
        ("Financial Obligations", "Bills arrive across 5+ utility apps, SMS, and WhatsApp. Disconnected due dates.", "Late payment penalties, power/broadband disconnections, and damaged CIBIL credit scores."),
        ("Document Custody", "Passports, deeds, and degrees scattered in almirahs or unencrypted phone galleries.", "Critical loss of original proofs; zero client-side encryption leaves identity data exposed to leaks."),
        ("Medical Emergencies", "Vitals, blood group, allergies, and insurance numbers buried during hospital triage.", "Golden-hour delays in ER admission; lack of immediate organ donor consent records."),
        ("Life Goals & Savings", "Goal targets lack dynamic inflation forecasting or emergency liquidation clarity.", "In an unforeseen medical crisis, families panic-sell illiquid assets at deep distress discounts.")
    ]
    
    for i, row in enumerate(prob_rows, start=1):
        for j, val in enumerate(row):
            style_data_cell(prob_table.cell(i, j), val, is_even=(i%2==0), width_in=[1.8, 2.3, 2.4][j])
            
    add_body_p(doc, "", space_after=8)
    
    add_heading_styled(doc, "1.2 The SAHAY Solution Architecture", level=2)
    add_body_p(doc, 
        "SAHAY (meaning 'Support' or 'Companion' in Sanskrit and Hindi) is an end-to-end Household Life-Admin Operating System. "
        "Designed specifically for the multi-generational dynamics of Indian families, SAHAY bridges elder accessibility, "
        "primary earner oversight, and nominee transparency under an unbreakable zero-knowledge cryptographic umbrella."
    )
    
    add_bullet_item(doc, " The platform performs client-side AES-256-GCM encryption before files touch disk or database.", "Zero-Knowledge Vault: ")
    add_bullet_item(doc, " Automated OCR extraction categorizes insurance, bills, marksheets, and identity cards with explainable confidence.", "Document Doctor Engine: ")
    add_bullet_item(doc, " Unified obligations timeline with proactive pre-penalty escalation alerts via email and push channels.", "Sahay Daily Timeline: ")
    add_bullet_item(doc, " Tamper-proof offline emergency medical card accessible via secure tokenized QR code for hospital staff.", "Health Shield: ")
    add_bullet_item(doc, " Target run-rate tracking paired with an intelligent emergency asset liquidation waterfall.", "Lakshya Goal Vaults: ")
    add_bullet_item(doc, " Grounded Retrieval-Augmented Generation (RAG) assistant answering household queries with exact citations.", "Sahay AI Assistant: ")

    # ==========================================
    # 3. KEY FEATURES & TECHNICAL BREAKDOWN
    # ==========================================
    add_heading_styled(doc, "2. Key Features & Comprehensive Module Details", level=1)
    
    # Module Table
    mod_table = doc.add_table(rows=8, cols=3)
    mod_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    mod_table.autofit = False
    set_table_borders(mod_table)
    
    m_headers = ["Module Name", "Primary Capability", "Key Technical Innovation"]
    for j, h in enumerate(m_headers):
        style_header_cell(mod_table.cell(0, j), h, [1.6, 2.4, 2.5][j])
        
    m_rows = [
        ("Overview & Foundation", "Executive household command center aggregating real-time metrics across all life areas.", "Aggregated health index, upcoming obligations counter, and system-wide audit status."),
        ("Household & Family", "Role-based family membership management with instant 8-character invite code generation.", "Granular RBAC (Owner, Adult, Dependent, Nominee, Emergency Contact) with invitation expiry."),
        ("Family Vault", "Encrypted file custodian with folder categorization, access grants, and expiry monitors.", "Hybrid encryption: Web Crypto API client-side + PyCryptodome backend envelope encryption."),
        ("Document Doctor", "Vision OCR, deterministic category guards, structured field extraction, and diff analysis.", "Dual-engine OCR (Google Gemini Vision + local regex fallback) with contract change diffing."),
        ("Sahay Daily", "Proactive life obligations timeline tracking utility bills, EMI payments, and renewals.", "Automated status transitions (Pending -> Due Soon -> Overdue) with financial impact modeling."),
        ("Health Shield", "Centralized health vitals, active prescriptions, doctor contacts, and emergency QR cards.", "Public tokenized emergency view for first responders without revealing full vault contents."),
        ("Lakshya Goal Vaults", "Collaborative milestone savings with inflation forecasting and liquidation waterfalls.", "Dynamic asset hierarchy: Liquid Savings -> FDs -> Mutual Funds -> Gold -> Real Estate.")
    ]
    
    for i, row in enumerate(m_rows, start=1):
        for j, val in enumerate(row):
            style_data_cell(mod_table.cell(i, j), val, is_even=(i%2==0), width_in=[1.6, 2.4, 2.5][j])
            
    add_body_p(doc, "", space_after=10)

    # Detailed subsections
    add_heading_styled(doc, "2.1 Household & Family: Multi-Generational RBAC", level=2)
    add_body_p(doc, 
        "Indian households do not follow flat organizational models; they consist of grandparents who may need read-only medical access, "
        "earning adults managing finances, teenage dependents requiring school document access, and external trusted nominees. "
        "SAHAY implements a deterministic Role-Based Access Control (RBAC) engine:"
    )
    add_bullet_item(doc, " Has full administrative control, household code creation, billing custody, and member invitation rights.", "Household Owner: ")
    add_bullet_item(doc, " Can upload documents, log obligations, and contribute to collaborative Lakshya savings vaults.", "Adult Family Member: ")
    add_bullet_item(doc, " Filtered interface with access strictly to their own health records and educational certificates.", "Dependent / Child: ")
    add_bullet_item(doc, " Designated emergency contact who receives cryptographic access upon verified life-event triggers.", "Trusted Nominee: ")

    add_heading_styled(doc, "2.2 Document Doctor: Vision OCR & Change Intelligence", level=2)
    add_body_p(doc, 
        "Document Doctor is SAHAY's proprietary document intelligence pipeline. When a document (PDF, PNG, JPG) is uploaded, "
        "it executes a multi-stage classification and extraction workflow:"
    )
    add_bullet_item(doc, " Extracts full verbatim textual data from scanned paper, mobile photos, and receipts.", "Stage 1 — Vision OCR: ")
    add_bullet_item(doc, " Prevents cross-category contamination (e.g., ensuring education certificates never adopt utility bill schemas).", "Stage 2 — Category Boundary Guard: ")
    add_bullet_item(doc, " Extracts entity-specific key-value pairs (e.g. Biller, Consumer Number, Policy Expiry, Roll Number, Tuition Fees).", "Stage 3 — Structured Field Extraction: ")
    add_bullet_item(doc, " Automatically masks PAN numbers, Aadhaar numbers, and bank account digits using client-friendly redaction.", "Stage 4 — Sensitive Data Redaction: ")
    add_bullet_item(doc, " Compares policy renewals or agreements to highlight price hikes, coverage removals, and new exclusions.", "Stage 5 — Change Intelligence: ")

    add_heading_styled(doc, "2.3 Health Shield & Tokenized Emergency QR Card", level=2)
    add_body_p(doc, 
        "In a sudden road accident or medical emergency, family members are often unreachable. Health Shield generates an encrypted, "
        "tokenized public QR code that paramedics or hospital admission desks can scan with any standard smartphone browser. "
        "The emergency view exposes critical life-saving data (Blood Group, Allergies, Chronic Illnesses, Emergency Doctor Contact, Organ Donor Status) "
        "while keeping financial records and sensitive legal documents securely locked."
    )

    add_heading_styled(doc, "2.4 Lakshya Goal Vaults & Emergency Liquidation Waterfall", level=2)
    add_body_p(doc, 
        "Traditional savings calculators simply multiply monthly savings by 12. Lakshya introduces two distinct innovations for Indian families:"
    )
    add_bullet_item(doc, " Dynamically factors annual inflation rates (e.g., 6.5% standard inflation, 10% educational/medical inflation) to project the true future cost of milestones.", "1. Inflation Run-Rate Engine: ")
    add_bullet_item(doc, " When an emergency occurs (e.g. ₹5,00,000 hospital deposit), the engine calculates an optimal liquidation strategy to minimize exit loads and tax penalties: Liquid Savings first, followed by Fixed Deposits, Mutual Funds, Sovereign Gold Bonds, and physical real estate as an absolute last resort.", "2. Emergency Liquidation Waterfall: ")

    # ==========================================
    # 4. SYSTEM & TECHNICAL ARCHITECTURE
    # ==========================================
    add_heading_styled(doc, "3. System & Technical Architecture", level=1)
    
    add_body_p(doc, 
        "SAHAY is architected as a high-performance, containerized microservices-ready system designed for low latency, "
        "zero-knowledge security, and zero single-points-of-failure."
    )
    
    # Architecture Diagram in Text/Box
    add_callout(doc, "SAHAY End-to-End Technical Architecture Flow",
        "┌─────────────────────────────────────────────────────────────────────────────────┐\n"
        "│                             CLIENT PRESENTATION LAYER                           │\n"
        "│  React 19 + TypeScript 5.8 + Vite + Tailwind CSS + Lucide Icons (Web Crypto API)│\n"
        "└────────────────────────────────────────┬────────────────────────────────────────┘\n"
        "                                         │ HTTPS / REST API / WSS\n"
        "┌────────────────────────────────────────▼────────────────────────────────────────┐\n"
        "│                             NGINX REVERSE PROXY LAYER                           │\n"
        "│  Port 80/443 Routing • SSL Termination • Security Headers • Gzip Compression    │\n"
        "└────────────────────────────────────────┬────────────────────────────────────────┘\n"
        "                                         │ Proxy Pass (127.0.0.1:8000)\n"
        "┌────────────────────────────────────────▼────────────────────────────────────────┐\n"
        "│                          APPLICATION SERVICES (FASTAPI 0.115)                   │\n"
        "│  • Auth & RBAC Guard        • Document Doctor OCR Pipeline                      │\n"
        "│  • Sahay Daily Scheduler    • Health Shield QR Tokenizer                        │\n"
        "│  • Lakshya Goal Engine      • Grounded Gemini AI Assistant                      │\n"
        "└────────────────────┬───────────────────────────────────┬────────────────────────┘\n"
        "                     │                                   │\n"
        "┌────────────────────▼──────────────┐   ┌────────────────▼────────────────────────┐\n"
        "│     RELATIONAL DATA STORE         │   │         IN-MEMORY CACHE & SESSIONS      │\n"
        "│  PostgreSQL 16 + PgVector         │   │  Redis 7 Alpine                         │\n"
        "│  35 Normalized Relational Tables  │   │  Token Blacklist • Rate Limiting        │\n"
        "│  ACID Transactions • Row Security │   │  Fast Metadata Cache                    │\n"
        "└───────────────────────────────────┘   └─────────────────────────────────────────┘\n"
        "                     │\n"
        "┌────────────────────▼────────────────────────────────────────────────────────────┐\n"
        "│                         IMMUTABLE CRYPTOGRAPHIC AUDIT STORE                     │\n"
        "│  SAHAY Shield: Append-only hash-chained ledger • DPDP Act 2023 Consent Audit    │\n"
        "└─────────────────────────────────────────────────────────────────────────────────┘",
        bg_color="F8FAFC", border_color="0F4C81"
    )
    
    add_heading_styled(doc, "3.1 Technology Stack Matrix", level=2)
    
    # Tech Stack Table
    tech_table = doc.add_table(rows=10, cols=4)
    tech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    tech_table.autofit = False
    set_table_borders(tech_table)
    
    t_headers = ["Layer", "Technology / Framework", "Version", "Key Functionality & Purpose"]
    for j, h in enumerate(t_headers):
        style_header_cell(tech_table.cell(0, j), h, [1.4, 1.8, 0.9, 2.4][j])
        
    t_rows = [
        ("Frontend UI", "React + TypeScript", "19.0 / 5.8", "Component-driven single page application with modern light design."),
        ("Build Tool", "Vite", "6.2.0", "Lightning-fast HMR and optimized production asset bundling."),
        ("Styling", "Tailwind CSS", "3.4.17", "Utility-first design tokens with customized SAHAY color palette."),
        ("Backend API", "FastAPI", "0.115.5", "High-throughput asynchronous Python framework with Pydantic v2 validation."),
        ("Database", "PostgreSQL + PgVector", "16-alpine", "ACID transactional store with 35 tables and vector embedding support."),
        ("ORM & Migrations", "SQLAlchemy (Async)", "2.0.36", "Fully non-blocking asynchronous database session and transaction management."),
        ("Cache & Queue", "Redis", "7-alpine", "In-memory session token store, rate limiting, and cache invalidation."),
        ("AI & Vision", "Google Gemini API", "3.1-flash-lite", "Multimodal document OCR, contract diffing, and grounded conversational RAG."),
        ("Security", "PyCryptodome / WebCrypto", "3.21.0 / W3C", "Client-side and backend envelope encryption using AES-256-GCM.")
    ]
    
    for i, row in enumerate(t_rows, start=1):
        for j, val in enumerate(row):
            style_data_cell(tech_table.cell(i, j), val, is_even=(i%2==0), width_in=[1.4, 1.8, 0.9, 2.4][j])
            
    add_body_p(doc, "", space_after=10)

    add_heading_styled(doc, "3.2 Cryptographic Security & DPDP Act 2023 Compliance", level=2)
    add_body_p(doc, 
        "Security in SAHAY is built on zero-knowledge isolation. Data is protected through a multi-tier envelope architecture:"
    )
    add_bullet_item(doc, " Files are encrypted in the user's browser using AES-256-GCM before transmission over TLS 1.3.", "1. Client-Side Encryption: ")
    add_bullet_item(doc, " Passwords and secret keys are hashed with 100,000 rounds of PBKDF2 with SHA-256 and unique per-user salts.", "2. Key Derivation: ")
    add_bullet_item(doc, " Every access grant, document viewing, and permission change is recorded in an immutable, append-only audit trail with SHA-256 verification hashes.", "3. Immutable Audit Trails: ")
    add_bullet_item(doc, " Full compliance with India's Digital Personal Data Protection (DPDP) Act 2023, including granular consent receipts, purposeful data minimization, and one-click Right to be Forgotten data deletion.", "4. DPDP Compliance: ")

    # ==========================================
    # 5. SCREENSHOTS OF WORKING PROJECT
    # ==========================================
    add_heading_styled(doc, "4. Screenshots of the Working Project", level=1)
    
    add_body_p(doc, 
        "Below are 5 core screenshots capturing the live, fully functional SAHAY platform operating on AWS EC2. "
        "Each view illustrates a distinct facet of the Household Life-Admin Operating System."
    )
    
    screenshots_dir = "c:/Users/ndhee/Sahay/screenshots"
    
    # 5 Key Screenshots to embed
    selected_screenshots = [
        ("Screenshot 2026-11-01 184820.png", "Figure 1: SAHAY Overview & Foundation Command Center", 
         "The unified executive dashboard displaying the Household Health Index, upcoming life obligations timeline, zero-knowledge privacy status, and system-wide navigational hubs."),
         
        ("Screenshot 2026-11-01 184854.png", "Figure 2: Zero-Knowledge Family Vault", 
         "The encrypted household document custodian displaying categorized repositories (Identity, Health, Financial, Education), granular document access badges, and upload triggers."),
         
        ("Screenshot 2026-11-01 184907.png", "Figure 3: Document Doctor AI Pipeline & Verification", 
         "The multi-stage AI intelligence pipeline interface showing vision OCR extraction, contract change diffing, sensitive field masking, and human-in-the-loop verification controls."),
         
        ("Screenshot 2026-11-01 184922.png", "Figure 4: Health Shield & Family Emergency Records Hub", 
         "The family medical command center tracking vital health records, active prescription dosage schedules, doctor contacts, registered organ donor status, and the public emergency QR access card."),
         
        ("Screenshot 2026-11-01 184934.png", "Figure 5: Lakshya Collaborative Goal Vaults & Liquidation Waterfall", 
         "The milestone savings interface displaying collaborative progress bars, inflation-adjusted run-rate forecasts, and the intelligent emergency asset liquidation hierarchy.")
    ]
    
    for file_name, fig_title, fig_desc in selected_screenshots:
        img_path = os.path.join(screenshots_dir, file_name)
        if os.path.exists(img_path):
            add_heading_styled(doc, fig_title, level=2)
            
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(4)
            p_img.paragraph_format.space_after = Pt(4)
            run_img = p_img.add_run()
            run_img.add_picture(img_path, width=Inches(6.2))
            
            p_caption = doc.add_paragraph()
            p_caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_caption.paragraph_format.space_before = Pt(2)
            p_caption.paragraph_format.space_after = Pt(12)
            r_cap = p_caption.add_run(f"🔍 {fig_desc}")
            r_cap.font.name = "Segoe UI"
            r_cap.font.size = Pt(8.5)
            r_cap.font.italic = True
            r_cap.font.color.rgb = RGBColor(100, 116, 139)
        else:
            add_body_p(doc, f"[Image file {file_name} not found at {img_path}]")

    # ==========================================
    # 6. AWS DEPLOYMENT & PRODUCTION SPECS
    # ==========================================
    add_heading_styled(doc, "5. AWS Cloud Deployment & Live Infrastructure", level=1)
    
    add_body_p(doc, 
        "SAHAY is deployed in production on Amazon Web Services (AWS) using an optimized multi-container Docker Compose architecture. "
        "The deployment ensures high availability, automatic restart policies, and isolated bridge networking."
    )
    
    # AWS Specs Table
    aws_table = doc.add_table(rows=8, cols=3)
    aws_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    aws_table.autofit = False
    set_table_borders(aws_table)
    
    a_headers = ["Infrastructure Parameter", "AWS Cloud Specification", "Operational Detail & Verification"]
    for j, h in enumerate(a_headers):
        style_header_cell(aws_table.cell(0, j), h, [2.0, 2.2, 2.3][j])
        
    a_rows = [
        ("Cloud Provider", "Amazon Web Services (AWS)", "Elastic Compute Cloud (EC2) Infrastructure"),
        ("Live Public IPv4 Address", "16.178.56.236", "Direct HTTP port 80 access routed via Nginx reverse proxy"),
        ("Interactive API Documentation", "http://16.178.56.236/docs", "Live OpenAPI / Swagger interactive endpoint testing suite"),
        ("Operating System", "Ubuntu 24.04 LTS (Noble Numbat)", "Linux 6.8.0-1018-aws x86_64 production kernel"),
        ("Container Orchestration", "Docker Compose v2", "4 running microservice containers (frontend, backend, postgres, redis)"),
        ("Database Service", "PostgreSQL 16 (pgvector/pgvector)", "Port 5432 with persistent Docker volume 'postgres_data'"),
        ("Reverse Proxy & Web Server", "Nginx 1.31.8 Alpine", "SPA client routing, gzip compression, and upstream proxy pass to :8000")
    ]
    
    for i, row in enumerate(a_rows, start=1):
        for j, val in enumerate(row):
            style_data_cell(aws_table.cell(i, j), val, is_even=(i%2==0), width_in=[2.0, 2.2, 2.3][j])
            
    add_body_p(doc, "", space_after=8)
    
    add_heading_styled(doc, "5.1 Production Container Topology", level=2)
    add_bullet_item(doc, " Serves compiled production React 19 static bundles and reverse-proxies `/api/v1` to the backend on internal bridge network.", "sahay_frontend (Nginx): ")
    add_bullet_item(doc, " Uvicorn ASGI server executing FastAPI 0.115 with 4 worker threads, connected to PostgreSQL and Redis.", "sahay_backend (Python 3.12): ")
    add_bullet_item(doc, " Production PostgreSQL 16 instance hosting all 35 relational tables with ACID compliance and automatic connection pooling.", "sahay_postgres: ")
    add_bullet_item(doc, " Fast in-memory cache for JWT blacklists, session token tracking, and rate limits.", "sahay_redis: ")

    # ==========================================
    # 7. LOCAL SETUP & USAGE GUIDE
    # ==========================================
    add_heading_styled(doc, "6. Setup, Local Development & Usage Guide", level=1)
    
    add_body_p(doc, 
        "The complete source code is hosted on GitHub at https://github.com/ndheeraj-shetty/sahay.git. "
        "Follow these instructions to run the project locally or replicate the AWS production environment:"
    )
    
    add_heading_styled(doc, "6.1 Prerequisites", level=2)
    add_bullet_item(doc, " Python 3.11 or 3.12 with `pip` and `virtualenv`")
    add_bullet_item(doc, " Node.js 20+ with `npm`")
    add_bullet_item(doc, " Docker & Docker Compose (optional for full containerized stack)")
    add_bullet_item(doc, " Google Gemini API Key (for Document Doctor OCR & AI Assistant)")

    add_heading_styled(doc, "6.2 Step-by-Step Execution Commands", level=2)
    
    # Code Commands Table / Box
    add_callout(doc, "Standard Local Run Commands",
        "# 1. Clone the repository\n"
        "git clone https://github.com/ndheeraj-shetty/sahay.git\n"
        "cd sahay\n\n"
        "# 2. Backend Setup\n"
        "cd backend\n"
        "python -m venv .venv\n"
        "source .venv/bin/activate  # Or on Windows: .venv\\Scripts\\activate\n"
        "pip install -r requirements.txt\n"
        "uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload\n\n"
        "# 3. Frontend Setup (in a separate terminal)\n"
        "cd frontend\n"
        "npm install\n"
        "npm run dev\n\n"
        "# Access the app at http://localhost:5173 and API docs at http://localhost:8000/docs",
        bg_color="F8FAFC", border_color="0EA5E9"
    )

    # Save Document
    output_filename = "c:/Users/ndhee/Sahay/SAHAY_BrainByte_Project_Documentation.docx"
    doc.save(output_filename)
    print(f"Documentation saved successfully to: {output_filename}")

if __name__ == "__main__":
    build_document()
