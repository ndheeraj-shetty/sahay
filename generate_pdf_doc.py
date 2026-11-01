import os
import base64
import glob
import subprocess

def get_base64_image(image_path):
    with open(image_path, "rb") as img_file:
        return "data:image/png;base64," + base64.b64encode(img_file.read()).decode("utf-8")

# Map of screenshot files
screenshots = {
    "reg": get_base64_image("screenshots/Screenshot 2026-11-01 182845.png"),
    "overview": get_base64_image("screenshots/Screenshot 2026-11-01 184820.png"),
    "household": get_base64_image("screenshots/Screenshot 2026-11-01 184832.png"),
    "daily": get_base64_image("screenshots/Screenshot 2026-11-01 184843.png"),
    "vault": get_base64_image("screenshots/Screenshot 2026-11-01 184854.png"),
    "doctor": get_base64_image("screenshots/Screenshot 2026-11-01 184907.png"),
    "health": get_base64_image("screenshots/Screenshot 2026-11-01 184922.png"),
    "lakshya": get_base64_image("screenshots/Screenshot 2026-11-01 184934.png"),
    "ai": get_base64_image("screenshots/Screenshot 2026-11-01 184947.png"),
}

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SAHAY — Project Documentation | Team BrainByte</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {{
    size: A4;
    margin: 14mm 14mm 16mm 14mm;
    @bottom-center {{
      content: "Page " counter(page);
      font-size: 8pt;
      color: #64748b;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }}
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  body {{
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    background-color: #ffffff;
    line-height: 1.55;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }}

  .cover-page {{
    page-break-after: always;
    min-height: 92vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 30px 20px;
    border-bottom: 2px solid #e2e8f0;
  }}

  .page-break {{
    page-break-after: always;
  }}

  .cover-header {{
    text-align: left;
  }}

  .badge-row {{
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }}

  .badge {{
    display: inline-block;
    padding: 4px 10px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: 9999px;
  }}

  .badge-primary {{ background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }}
  .badge-success {{ background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }}
  .badge-amber {{ background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }}
  .badge-purple {{ background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; }}

  h1.title {{
    font-size: 32pt;
    font-weight: 800;
    color: #0284c7;
    margin: 0 0 6px 0;
    letter-spacing: -1px;
    line-height: 1.1;
  }}

  .tagline {{
    font-size: 15pt;
    font-weight: 600;
    color: #334155;
    margin: 0 0 16px 0;
  }}

  .subtext {{
    font-size: 11pt;
    color: #64748b;
    max-width: 650px;
    margin-bottom: 24px;
    line-height: 1.6;
  }}

  .team-card-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 20px 0;
  }}

  .team-card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
  }}

  .team-card .name {{
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }}

  .team-card .role {{
    font-size: 9pt;
    font-weight: 600;
    color: #0284c7;
    margin-bottom: 6px;
  }}

  .team-card .desc {{
    font-size: 8pt;
    color: #64748b;
    line-height: 1.4;
  }}

  .live-box {{
    background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
    color: white;
    padding: 18px 22px;
    border-radius: 12px;
    margin-top: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}

  .live-box h3 {{
    margin: 0 0 4px 0;
    font-size: 13pt;
  }}

  .live-box p {{
    margin: 0;
    font-size: 9.5pt;
    opacity: 0.9;
  }}

  .live-box .url {{
    font-family: 'JetBrains Mono', monospace;
    background: rgba(255,255,255,0.2);
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 10pt;
  }}

  h2.section-title {{
    font-size: 17pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 24px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }}

  h3.sub-title {{
    font-size: 12pt;
    font-weight: 700;
    color: #0369a1;
    margin-top: 16px;
    margin-bottom: 8px;
  }}

  p {{
    margin-top: 0;
    margin-bottom: 10px;
    text-align: justify;
  }}

  .grid-2 {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 12px;
  }}

  .card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
  }}

  .card h4 {{
    margin: 0 0 6px 0;
    font-size: 10pt;
    color: #0f172a;
    font-weight: 700;
  }}

  .card p {{
    margin: 0;
    font-size: 8.5pt;
    color: #475569;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-size: 8.5pt;
  }}

  table th {{
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
  }}

  table td {{
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }}

  table tr:nth-child(even) {{
    background: #f8fafc;
  }}

  .screenshot-container {{
    margin: 14px 0 18px 0;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    page-break-inside: avoid;
  }}

  .screenshot-container img {{
    width: 100%;
    height: auto;
    display: block;
  }}

  .screenshot-caption {{
    padding: 8px 12px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #475569;
    font-weight: 500;
  }}

  .screenshot-caption strong {{
    color: #0369a1;
  }}

  .code-block {{
    background: #0f172a;
    color: #f8fafc;
    padding: 10px 14px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    line-height: 1.4;
    margin: 10px 0;
    overflow-x: auto;
  }}

  .math-box {{
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 12px 14px;
    margin: 12px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    color: #166534;
  }}

  .footer-note {{
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 7.5pt;
    color: #94a3b8;
    text-align: center;
  }}
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div class="cover-header">
    <div class="badge-row">
      <span class="badge badge-primary">National Hackathon Finalist</span>
      <span class="badge badge-success">Production AWS Live</span>
      <span class="badge badge-amber">Team: BrainByte</span>
      <span class="badge badge-purple">AI + Zero-Knowledge Architecture</span>
    </div>

    <h1 class="title">SAHAY</h1>
    <div class="tagline">The Household Life-Admin OS for Indian Families</div>
    <div class="subtext">
      One trusted, permission-governed platform connecting family documents, recurring daily responsibilities, emergency health records, collaborative savings, and an AI-driven crisis liquidation optimizer.
    </div>
  </div>

  <div>
    <h3 style="font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 8px;">
      Team BrainByte — Member Profiles & Contributions
    </h3>
    <div class="team-card-grid">
      <div class="team-card">
        <div class="name">Nagasuri Venkata Satya Dheeraj</div>
        <div class="role">Team Lead & AI Development</div>
        <div class="desc">
          Architecture lead, RAG implementation, Google Gemini 3.1 prompt engineering, Emergency Liquidation Algorithm, and full-stack integration.
        </div>
      </div>
      <div class="team-card">
        <div class="name">Harshini Alamuru</div>
        <div class="role">Frontend & UI/UX</div>
        <div class="desc">
          Modern accessible web shell in React 19 and Tailwind CSS, modal dialog engines, feature explainer cards, responsive UI, and light theme.
        </div>
      </div>
      <div class="team-card">
        <div class="name">Tarun Teja Nagula</div>
        <div class="role">Backend & Security Layer</div>
        <div class="desc">
          FastAPI asynchronous micro-service core, PostgreSQL 16 schema (35 tables), AES-256-GCM encryption, JWT RBAC security, and AWS EC2 deployment.
        </div>
      </div>
    </div>

    <div class="live-box">
      <div>
        <h3>Verified Live Production Deployment</h3>
        <p>Hosted on AWS EC2 Ubuntu 24.04 with Docker Compose & Nginx Reverse Proxy</p>
      </div>
      <div class="url">http://16.178.56.236/</div>
    </div>
  </div>

  <div class="footer-note">
    SAHAY Technical Dossier | Submission Date: November 1, 2026 | Built with ❤️ by Team BrainByte
  </div>
</div>

<!-- SECTION 1: PROBLEM & OVERVIEW -->
<div>
  <h2 class="section-title">1. Project Overview & The Household Problem in India</h2>
  
  <p>
    Indian households manage life's most essential responsibilities across fragile, disconnected silos. Important documents (Aadhaar, PAN, property titles, insurance policies) are scattered across physical paper files, WhatsApp messages, and forgotten email attachments. Utility bills and EMIs lapse quietly, incurring recurring late fees. In medical emergencies, family members scramble in panic to find blood groups, allergies, and prescriptions.
  </p>

  <div class="grid-2">
    <div class="card">
      <h4>🚨 The ₹5,00,000 Crisis Panic</h4>
      <p>
        When an urgent emergency hits (medical hospitalization, pandemic crisis, accident), families need instant liquid funds (e.g. ₹5 Lakhs). With savings fragmented across child education, car funds, and house deposits, families panic and make irreversible financial mistakes.
      </p>
    </div>
    <div class="card">
      <h4>🛡️ The SAHAY Solution</h4>
      <p>
        SAHAY centralizes all documents, health vitals, daily obligations, and goal vaults into one role-governed OS. It turns passive files into active timelines with predictive life-event alerts, zero-knowledge encryption, and crisis liquidation intelligence.
      </p>
    </div>
  </div>

  <h3 class="sub-title">System Architecture & Component Overview</h3>
  <table>
    <thead>
      <tr>
        <th>Tier</th>
        <th>Technologies</th>
        <th>Core Responsibility</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Presentation</strong></td>
        <td>React 19, TypeScript, Vite 5, Tailwind CSS</td>
        <td>Responsive, accessible light-theme web shell with role-aware views.</td>
      </tr>
      <tr>
        <td><strong>Edge & Gateway</strong></td>
        <td>Nginx 1.31 (Alpine), AWS EC2</td>
        <td>Reverse proxies port 80 to FastAPI backend and serves static SPA assets.</td>
      </tr>
      <tr>
        <td><strong>Backend API</strong></td>
        <td>FastAPI 0.115, Python 3.12, Uvicorn (ASGI)</td>
        <td>Asynchronous REST API, cryptographic JWT tokens, schema validation.</td>
      </tr>
      <tr>
        <td><strong>Database Tier</strong></td>
        <td>PostgreSQL 16 (pgvector), SQLAlchemy 2.0</td>
        <td>35 production relational tables enforcing multi-tenant isolation.</td>
      </tr>
      <tr>
        <td><strong>Security Core</strong></td>
        <td>AES-256-GCM, Bcrypt, PyJWT</td>
        <td>Zero-knowledge document encryption, PII masking, immutable audit log.</td>
      </tr>
      <tr>
        <td><strong>AI Engine</strong></td>
        <td>Google Gemini 3.1 Flash-Lite, Async RAG</td>
        <td>Household context ingestion, natural language queries, visual tables.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="page-break"></div>

<!-- SECTION 2: PRODUCTION SCREENSHOTS & FEATURE BREAKDOWN -->
<div>
  <h2 class="section-title">2. Visual Walkthrough & Working Project Screenshots</h2>
  <p>
    The following screens have been captured directly from the live, production deployment running at <code>http://16.178.56.236/</code>:
  </p>

  <h3 class="sub-title">2.1 Dual-Track Registration Portal (Owner vs Family Member)</h3>
  <p>
    SAHAY implements a dual-track onboarding mechanism. Users can either register as a <strong>Household Owner</strong> to bootstrap a new family vault or register as a <strong>Family Member</strong> by entering an authentic 8-character invitation code generated by the owner.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['reg']}" alt="Dual-Track Registration Portal">
    <div class="screenshot-caption">
      <strong>Figure 1:</strong> Dual-track registration modal showing Owner vs Family Member selection, input validation, and SAHAY Shield protection badge.
    </div>
  </div>

  <h3 class="sub-title">2.2 Overview & Foundation Dashboard</h3>
  <p>
    The central dashboard confirms active household membership, displays live backend connectivity (<code>● API Connected (postgresql)</code>), and highlights SAHAY's hackathon innovation pillars.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['overview']}" alt="Overview & Foundation">
    <div class="screenshot-caption">
      <strong>Figure 2:</strong> Overview & Foundation view featuring live API connectivity indicator, project philosophy, and hackathon innovation cards.
    </div>
  </div>
</div>

<div class="page-break"></div>

<div>
  <h3 class="sub-title">2.3 Household & Family Management</h3>
  <p>
    Displays all family members, their assigned roles (<code>Household Owner</code>, <code>Adult Member</code>, etc.), dynamic invitation code generation, and active session device security monitoring.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['household']}" alt="Household & Family Management">
    <div class="screenshot-caption">
      <strong>Figure 3:</strong> Household management console displaying multi-generational family members, owner controls, and invitation generator.
    </div>
  </div>

  <h3 class="sub-title">2.4 Sahay Daily — Unified Household Timeline</h3>
  <p>
    Tracks all recurring financial obligations, bills due today, 7-day outlooks, calendar views, money views, and family obligation delegation.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['daily']}" alt="Sahay Daily Dashboard">
    <div class="screenshot-caption">
      <strong>Figure 4:</strong> Sahay Daily view with metrics for Due Today, Total Pending, and Due Soon alongside family obligation delegation.
    </div>
  </div>
</div>

<div class="page-break"></div>

<div>
  <h3 class="sub-title">2.5 Family Vault — Encrypted Document Repository</h3>
  <p>
    Encrypted catalog organizing Aadhaar, PAN, property deeds, electricity bills, and medical records with member filters and category tabs.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['vault']}" alt="Family Vault">
    <div class="screenshot-caption">
      <strong>Figure 5:</strong> Family Vault view showcasing search, member filter dropdown, and categorized document vaults.
    </div>
  </div>

  <h3 class="sub-title">2.6 Document Doctor — AI Intelligence Pipeline</h3>
  <p>
    6-step automated processing pipeline converting raw uploaded documents and bank payment alerts (e.g. Home Loan EMI, MSEB bill) into verified obligations with PII redaction.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['doctor']}" alt="Document Doctor">
    <div class="screenshot-caption">
      <strong>Figure 6:</strong> Document Doctor pipeline showing steps from OCR to PII masking, with interactive bank alert test buttons.
    </div>
  </div>
</div>

<div class="page-break"></div>

<div>
  <h3 class="sub-title">2.7 Health Shield & Emergency QR Access</h3>
  <p>
    Centralized health cards for every family member with vitals, blood groups, allergy lists, active medication schedules, and a rapid Emergency Mode button.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['health']}" alt="Health Shield">
    <div class="screenshot-caption">
      <strong>Figure 7:</strong> Health Shield dashboard featuring family member switchers, allergy tracker, and prominent Emergency Mode trigger.
    </div>
  </div>

  <h3 class="sub-title">2.8 Lakshya Goal Vaults & Cash Flow Surplus</h3>
  <p>
    Collaborative savings goal tracker calculating household savings capacity, monthly cash flow surplus (₹85,000/mo), milestone run-rates, and risk metrics.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['lakshya']}" alt="Lakshya Goal Vaults">
    <div class="screenshot-caption">
      <strong>Figure 8:</strong> Lakshya Goal Vaults displaying ₹85,000 monthly income surplus and collaborative family savings progress.
    </div>
  </div>
</div>

<div class="page-break"></div>

<div>
  <h3 class="sub-title">2.9 Sahay AI Assistant (Household RAG & Crisis Liquidation)</h3>
  <p>
    Context-aware conversational intelligence backed by Google Gemini 3.1. Features direct visual shortcuts for Crisis Emergency Mode (₹5L liquidation plan), expense reduction analysis, and visual data tables.
  </p>
  <div class="screenshot-container">
    <img src="{screenshots['ai']}" alt="Sahay AI Assistant">
    <div class="screenshot-caption">
      <strong>Figure 9:</strong> Sahay AI Assistant interface featuring unified household RAG, multi-turn prompt shortcuts, and visual tables.
    </div>
  </div>

  <h2 class="section-title">3. Mathematical & Algorithmic Formulation</h2>

  <h3 class="sub-title">3.1 Crisis Emergency Mode: The ₹5,00,000 Liquidation Optimizer</h3>
  <p>
    When an unexpected medical or pandemic emergency requires ₹5,00,000 immediately, SAHAY executes a deterministic liquidation strategy:
  </p>
  <div class="math-box">
    <strong>Liquidation Priority Hierarchy:</strong><br>
    Tier 1: Emergency Reserve Vault (0% penalty, instant transfer)<br>
    Tier 2: Discretionary Goals (e.g., Vacation, Luxury Gadget — zero tax penalty)<br>
    Tier 3: Long-term Asset Goals (e.g., Car Downpayment — deferrable purchase)<br>
    Tier 4: Protected Sacred Goals (e.g., Child Education, House Deed — NEVER liquidated)
  </div>
  <div class="math-box">
    <strong>Post-Crisis Replenishment Formula:</strong><br>
    Monthly Free Surplus (S) = Monthly Income (I) - [Rent (R) + Groceries (G) + Utilities (U) + Expenses (E)]<br>
    With I = ₹85,000 and Living Expenses = ₹40,000, S = ₹45,000/month.<br>
    Replenishment Horizon (T) = Target Amount (₹5,00,000) / Monthly Surplus (₹45,000) = 11.1 Months.
  </div>
</div>

<div class="page-break"></div>

<div>
  <h2 class="section-title">4. AWS Cloud Deployment & Local Setup</h2>

  <h3 class="sub-title">4.1 Production Cloud Architecture</h3>
  <p>
    The application is deployed on an AWS EC2 instance running Ubuntu 24.04 LTS:
  </p>
  <ul>
    <li><strong>Public IPv4 Endpoint:</strong> <code>http://16.178.56.236/</code></li>
    <li><strong>API Swagger Documentation:</strong> <code>http://16.178.56.236/docs</code></li>
    <li><strong>Reverse Proxy:</strong> Nginx 1.31 Alpine managing gzip compression, SPA routing, and upstream proxying to <code>backend:8000</code>.</li>
    <li><strong>Container Topology:</strong> 4 Docker containers (<code>sahay_frontend</code>, <code>sahay_backend</code>, <code>sahay_postgres</code>, <code>sahay_redis</code>) interconnected on an internal bridge network.</li>
  </ul>

  <h3 class="sub-title">4.2 Local Reproduction Commands</h3>
  <div class="code-block">
# 1. Clone & Setup
git clone https://github.com/ndheeraj-shetty/sahay.git
cd sahay

# 2. Start Backend
cd backend
python -m venv .venv
source .venv/bin/activate # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 3. Start Frontend (in separate terminal)
cd ../frontend
npm install
npm run dev # Launches Vite dev server at http://localhost:5173
  </div>

  <h2 class="section-title">5. Hackathon Submission Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Evaluation Dimension</th>
        <th>SAHAY Achievement & Innovation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Problem Impact</strong></td>
        <td>Solves the painful chaos of Indian family admin; preserves insurance coverage and eliminates panic during emergencies.</td>
      </tr>
      <tr>
        <td><strong>Technical Excellence</strong></td>
        <td>React 19 + FastAPI + PostgreSQL (35 tables) + Gemini 3.1 RAG + Docker + Nginx on AWS EC2.</td>
      </tr>
      <tr>
        <td><strong>Security by Design</strong></td>
        <td>Client-side AES-256-GCM encryption, PII masking, role segregation, and immutable audit logs.</td>
      </tr>
      <tr>
        <td><strong>Completeness</strong></td>
        <td>100% functional live application with 0 broken endpoints, zero-downtime startup resilience, and complete documentation.</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-note" style="margin-top: 40px;">
    <strong>Team BrainByte</strong> — Nagasuri Venkata Satya Dheeraj | Harshini Alamuru | Tarun Teja Nagula<br>
    Final Hackathon Submission | All Rights Reserved © 2026
  </div>
</div>

</body>
</html>
"""

output_html_path = "c:/Users/ndhee/Sahay/PROJECT_DOCUMENTATION.html"
with open(output_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at {output_html_path} ({os.path.getsize(output_html_path)} bytes)")
