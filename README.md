# 🎟️ Municipal Teachers' Day 2026 Raffle System
**Municipality of Malungon, Sarangani Province**  
*A modern, auditable, and projector-ready raffle and attendance management platform for 2,000+ DepEd and Private educators.*

---

## 📚 Committee Documentation & Manuals

Comprehensive documentation has been prepared specifically for the **Municipal Teachers' Day Organizing Committee**, DepEd district supervisors, school principals, and technical working groups:

1. **[Executive System Presentation (Slide Deck)](docs/TEACHERS_COMMITTEE_PRESENTATION.md)**  
   *16-slide presentation deck covering system objectives, 5-district architecture, mathematical fairness guarantees, stage visuals, anti-error safeguards, and event-day execution timeline.*
2. **[End-to-End System Workflow](docs/SYSTEM_WORKFLOW.md)**  
   *Detailed phase-by-phase visual workflows, data synchronization diagrams, security controls, and multi-station communication paths.*
3. **[Standard Operating Procedures & User Operations Manual](docs/OPERATIONS_MANUAL.md)**  
   *Complete SOP manual for all 6 committee roles: System Administrator, Gate Registration Officers, Stage Projector Operators, Pre-Draw Station Marshals, Claims & Disbursing Officers, and Audit Leads.*

---

## 🌟 Key System Capabilities

- **5 Visual District Panes (2-2-1 Arrangement):** Displays `NORTH`, `EAST`, `WEST`, `SOUTH`, and `PRIVATE` (Private Schools + ECCD Daycare + Local School Board) simultaneously on the gymnasium LED wall.
- **Single Winner Hero Spotlight:** Automatically morphs into a full-screen celebratory showcase card for 1-of-1 Grand Prize draws.
- **Mathematical Fairness:** Powered by the unbiased Fisher-Yates shuffle algorithm across a single combined pool of eligible teachers.
- **Two-Stage Confirmation:** Results remain provisional after spinning until the administrator reviews and clicks **"Confirm Winners"** (with full, risk-free **"Redraw"** capabilities).
- **Multi-Station Sync (Supabase Cloud + Offline Resilience):**
  - **Gate Attendance (`/attendance`):** High-speed 2D barcode scanner gun and webcam QR check-in.
  - **Live Stage Projector (`/`):** Full-screen projector mode with audio ticks, countdown, and canvas confetti.
  - **Pre-Draw Station (`/admin`):** Batch drawing engine for minor consolation prizes.
  - **Real-Time Claims Desk (`/claims`):** Winner stub verification, proxy claim handling, and signed receipt generation.
  - **Print Queue Station:** Instant printing of official verification stubs and batch sheets.
- **Zero-Cost Google Workspace Fallback:** Fully operational standalone Google Apps Script and Google Sheets integration in `gas/`.

---

## 🚀 Quick Start Guide

### Option A: Modern Web Application (Next.js 15)

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Configure Environment:**
   Copy `.env.example` to `.env.local` and set your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. **Run Locally:**
   ```bash
   npm run dev
   ```
4. **Access Workstations:**
   - **Main Stage & Admin:** `http://localhost:3000` (Default PIN: `2026`)
   - **Gate Registration Desk:** `http://localhost:3000/attendance`
   - **Prize Claims Desk:** `http://localhost:3000/claims`

### Option B: Google Sheets & Apps Script Deployment (Zero-Cost)
Refer to the complete step-by-step setup in **[`gas/README.md`](gas/README.md)**.
