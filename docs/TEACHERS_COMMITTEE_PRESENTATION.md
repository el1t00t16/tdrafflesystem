# 🎤 Municipal Teachers' Day 2026 Raffle System
## Executive Overview & System Presentation
**Municipality of Malungon, Province of Sarangani**  
*Presented to the Municipal Teachers' Day Organizing Committee, DepEd Malungon District Leadership, and Working Committees*

---

## 📑 Slide Deck Structure

- **Slide 1:** Title & Purpose of the System
- **Slide 2:** Executive Summary & Key Objectives
- **Slide 3:** The Five-District Visual Architecture (2-2-1 Display)
- **Slide 4:** Core Fairness & Mathematical Integrity
- **Slide 5:** Multi-Station Operational Ecosystem (How Everything Connects)
- **Slide 6:** Station 1 — Gate Registration & QR Attendance
- **Slide 7:** Station 2 — Pre-Draw Station (Managing Minor Prizes Efficiently)
- **Slide 8:** Station 3 — Live Stage Raffle Display & Projector Controls
- **Slide 9:** Two-Stage Confirmation: The Anti-Error Safeguard
- **Slide 10:** Station 4 — Real-Time Claims Desk & Security Verification
- **Slide 11:** Station 5 — Automated Print Queue & Official Receipts
- **Slide 12:** Audit, Reports & Official Transparency
- **Slide 13:** Dual-Engine Architecture (Cloud Web App + Google Sheets Fallback)
- **Slide 14:** Offline Resilience & Emergency Contingencies
- **Slide 15:** Roles, Working Committee Assignments & Event Timeline
- **Slide 16:** Frequently Asked Questions (FAQ) & Open Forum

---

### Slide 1: Title & Purpose
```
================================================================================
                    MUNICIPAL TEACHERS' DAY 2026 RAFFLE SYSTEM
               A Modern, Transparent, and Projector-Ready Solution
                       Malungon Gymnasium, Sarangani Province
================================================================================
```

#### Key Message
The Municipal Teachers' Day 2026 Raffle System is a custom-engineered, transparent, and audit-ready digital platform built specifically for the celebration of **2,000+ teaching and non-teaching personnel** in Malungon. It replaces slow, error-prone manual tambiolo draws with an instantaneous, tamper-proof, and visually exciting experience on the giant LED wall/projector.

#### Presenter Notes
> *"Good morning, members of the Teachers' Committee, district supervisors, school principals, and municipal officials. Today, we are presenting our official Raffle System for Teachers' Day 2026. This system was designed with three non-negotiable principles: Absolute Fairness, Stage Excitement, and Zero Paperwork Confusion on event day."*

---

### Slide 2: Executive Summary & Core Mandates
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CORE DESIGN MANDATES                            │
├─────────────────────┬──────────────────────────┬─────────────────────────────┤
│ 1. ABSOLUTE FAIRNESS│ 2. STAGE VISIBILITY      │ 3. ZERO HUMAN ERROR         │
│ One unified pool    │ 5 District cards shown   │ Two-stage confirmation      │
│ Fisher-Yates shuffle│ simultaneously (2-2-1)   │ Redraw without data damage  │
│ 100% auditable logs │ Giant celebratory names  │ Barcode & QR verified claims│
└─────────────────────┴──────────────────────────┴─────────────────────────────┘
```

#### The Challenges We Solved
1. **Handling 2,000+ Attendees Smoothly:** Manual draws with 2,000 stubs take hours, cause physical fatigue, and lead to lost paper tickets.
2. **Representing Every District Visually:** Teachers want to see their district represented on screen at all times.
3. **Preventing Disputes:** Duplicate registrations, disputed winners, or claimed prizes are completely eliminated through digital validation and timestamped logs.
4. **Fast Disbursing:** Winners are processed immediately at dedicated claims desks while the stage program continues without delay.

---

### Slide 3: The Five-District Visual Architecture
```
                         =============================
                         TOP ROW: NORTH (01) & EAST (02)
                         =============================
                         [ NORTH DISTRICT ]    [ EAST DISTRICT ]
                         Card 01 - Blue Accent  Card 02 - Green Accent

                         =============================
                         MID ROW: WEST (03) & SOUTH (04)
                         =============================
                         [ WEST DISTRICT ]     [ SOUTH DISTRICT ]
                         Card 03 - Amber Accent Card 04 - Purple Accent

                         =============================
                         BOTTOM ROW: PRIVATE & SPECIAL (05)
                         =============================
                         [ PRIVATE / ECCD / LSB ]
                         Card 05 - Centered Hero Display
```

#### Key Highlights
- **5 Simultaneous Cards:** Always visible on screen so teachers from all corners of Malungon see their district actively in play.
- **District Classification Rules:**
  - **North District:** All DepEd North elementary and secondary schools. Includes East & North PSDS routing.
  - **East District:** All DepEd East schools. Includes East & South PSDS routing.
  - **West District:** All DepEd West schools.
  - **South District:** All DepEd South schools.
  - **Private / ECCD / LSB:** Comprehensive inclusion of Private school teachers, Early Childhood Care and Development (ECCD) daycare educators, and Local School Board (LSB) teachers.
- **Single Winner Hero Spotlight:** When drawing a 1-of-1 Grand Prize (e.g. Smart TV, Motorcycle, or Laptop), the 5-card layout seamlessly transitions into a majestic full-screen **Hero Spotlight Card** with celebratory gold-emerald borders.

---

### Slide 4: Core Fairness & Mathematical Integrity
```
                    [ 2,000+ ELIGIBLE TEACHERS COMBINED POOL ]
                                        │
                         [ Cryptographic Shuffle ]
                      (Unbiased Fisher-Yates Algorithm)
                                        │
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
         MODE A: COMBINED POOL                     MODE B: EQUAL PER DISTRICT
   "Total Winners = Total Prizes"              "Guaranteed Balance Per Area"
   E.g., 5 Winners drawn naturally             E.g., 2 Winners per card = 10
   across all 5 districts based on             equal winners across North,
   pure mathematical random probability.       South, East, West, & Private.
```

#### Why This Is Guaranteed Fair
1. **Centralized Random Selection:** By default, selection occurs from **ONE unified pool** of all verified eligible teachers present.
2. **No Rigging, No Favoritism:** Every eligible teacher has the exact same probability of winning.
3. **Configurable Distribution Modes:**
   - **Combined Pool:** Ideal for general minor, major, and grand prizes.
   - **Equal Per District:** Ideal when sponsors designate equal prizes across all 5 districts.
   - **Target District Redraw:** Allows redrawing exclusively for a single district if an individual prize requires replacement.
4. **Strict Eligibility Filter:**
   - Only validated **Teaching Personnel** enter the raffle pool.
   - Must be registered and checked in at the attendance gate.
   - Duplicate prevention prevents any teacher from winning twice (unless "Allow Multiple Wins" is explicitly enabled).

---

### Slide 5: The Multi-Station Operational Ecosystem

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                       CLOUD SYNCHRONIZATION ENGINE                     │
   │               (Real-Time Supabase Sync + Local Offline Cache)          │
   └───────▲───────────────────────▲──────────────────────▲─────────────────┘
           │                       │                      │
   ┌───────┴────────┐      ┌───────┴────────┐     ┌───────┴────────┐
   │   STATION 1    │      │   STATION 2    │     │   STATION 3    │
   │  GATE SCANNER  │      │  STAGE CONTROL │     │  CLAIMS DESK   │
   │  (QR / Barcode │      │  (Projector /  │     │ (ID Check &    │
   │   Attendance)  │      │   LED Screen)  │     │  Prize Release)│
   └────────────────┘      └───────▲────────┘     └───────▲────────┘
                                   │                      │
                           ┌───────┴────────┐     ┌───────┴────────┐
                           │   STATION 4    │     │   STATION 5    │
                           │ PRE-DRAW REEL  │     │  PRINT QUEUE   │
                           │(Minor Batches) │     │ (Stubs & Slips)│
                           └────────────────┘     └────────────────┘
```

#### Why Dedicated Stations Matter
Instead of clustering 10 people around one laptop, the system splits operations into synchronized, role-based workstations:
1. **Entrance Gates:** Fast scanning of teacher badges (no queue bottlenecks).
2. **Audio-Visual Stage:** Dedicated to high-definition visuals on the LED wall.
3. **Pre-Draw Desk:** Pre-draws dozens of minor consolation prizes in advance so the stage program finishes on schedule.
4. **Claims Desk:** Validates IDs and distributes physical prizes in an orderly queue.
5. **Print Station:** Prints official verification stubs and releasing receipts.

---

### Slide 6: Station 1 — Gate Registration & QR Attendance
```
[ Teacher Arrives ] ──► [ Presents Badge / ID ] ──► [ QR Code Scanned ]
                                                           │
                      ┌────────────────────────────────────┴────────────────┐
                      ▼                                                     ▼
           [ SUCCESS CHIME 🔔 ]                                   [ WARNING BUZZ ⚠️ ]
      "Welcome, Maria Santos!"                              "Already Scanned at Gate 1"
   Status updated: PRESENT & ELIGIBLE                           Duplicate Prevented!
```

#### Gate Features
- **3 Scanning Modes:**
  1. **Built-in Camera Scanner:** Uses phone, tablet, or laptop webcam to scan QR badges.
  2. **High-Speed Hardware Barcode Gun:** Plug-and-play USB/Bluetooth 2D scanner for instant 0.2-second check-ins.
  3. **Manual Instant Search:** Fallback search by DepEd ID, Surname, or School if a teacher forgot their badge.
- **Live District Attendance Counters:** Committee leaders can see live turnout per district in real time.
- **PIN-Protected Gate Session:** Prevents unauthorized individuals from tampering with attendance records.

---

### Slide 7: Station 2 — Pre-Draw Station
```
                      PRE-DRAW TIME-SAVING ENGINE
   ┌───────────────────────────────────────────────────────────────┐
   │ Problem: Drawing 300 minor umbrella/cash prizes on stage      │
   │          would take 4+ hours and exhaust the audience.        │
   ├───────────────────────────────────────────────────────────────┤
   │ Solution: The Pre-Draw Station draws minor consolation        │
   │           prizes under official committee supervision         │
   │           in audited batches with full printout verification. │
   └───────────────────────────────────────────────────────────────┘
```

#### How It Works
- Filter prizes by category (`MINOR` / `CONSOLATION`).
- Select batch size (e.g., 20 electric fans or 50 cash envelopes).
- Run high-speed 3-second animated shuffle reel.
- Print certified batch list immediately for posting on district bulletin boards and direct claim routing.
- Keeps the live stage reserved for Major and Grand Prizes!

---

### Slide 8: Station 3 — Live Stage Raffle Display
```
[ LED WALL / PROJECTOR DISPLAY ]
┌──────────────────────────────────────────────────────────────────────────────┐
│  MUNICIPAL TEACHERS' DAY 2026                 MALUNGON GYMNASIUM, SARANGANI │
│  Active Prize: ₱10,000 CASH INCENTIVE (Grand Prize 01)     Total Winners: 1  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        ⚡ SHUFFLING CANDIDATES... ⚡                         │
│                                                                              │
│                         ★ SANTOS, MARIA G. ★                                 │
│                                                                              │
│             [ MALUNGON CENTRAL ELEMENTARY SCHOOL | NORTH DISTRICT ]          │
│                                                                              │
│  COUNTDOWN: 3 ... 2 ... 1 ...                      🎊 CONFETTI EXPLOSION 🎊  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Stage Features
- **Projector-Ready Full Stage Mode:** Hides browser toolbars and administrative buttons with a single click.
- **High-Impact Audio Synthesis:** Synthesized mechanical ticks, rolling lottery reels, dramatic 3-2-1 countdown beeps, and grand victory fanfare.
- **Canvas Confetti Particle Physics:** Dynamic multicolor confetti blasts celebrate each confirmed win.
- **Dynamic Text Scaling:** Winner names automatically adjust font size so long names never clip or wrap awkwardly.

---

### Slide 9: Two-Stage Confirmation — The Anti-Error Safeguard
```
[ STEP 1: TRIGGER DRAW ]
            │
            ▼
[ STEP 2: SHUFFLE & REVEAL ]
            │
            ▼
[ PROVISIONAL RESULT REVIEW MODAL ]
            │
   ┌────────┴──────────────────────────────────────────┐
   ▼                                                   ▼
[ ✓ CONFIRM WINNERS ]                           [ 🔄 REDRAW ROUND ]
- Decrements prize inventory                    - Discards provisional result
- Marks teacher as WINNER                       - Database remains 100% clean
- Pushes to Live Claims Desk                    - Teacher re-enters eligible pool
- Adds to immutable Audit Log                   - Safely triggers a fresh draw
```

#### Why This Protects the Committee
In live events, mistakes happen: an ineligible guest might be drawn, an absent person might be called, or the host might need a test run.
- **Provisional State:** Drawing names does **NOT** immediately alter the database.
- Only when the Committee Chairman or Stage Controller clicks **"CONFIRM WINNERS"** is the record permanently committed.
- **Browser Crash Protection:** If a laptop accidentally loses power or refreshes, the pending unconfirmed draw is automatically restored from local storage!

---

### Slide 10: Station 4 — Real-Time Claims Desk
```
[ Winner Approaches Desk ] ──► [ Shows ID / Winner Stub ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         DIRECT WINNER CLAIM                             AUTHORIZED PROXY CLAIM
   - DepEd ID / Gov ID verified                    - Letter of Authorization checked
   - Instant Search by Name or ID                  - Proxy Name & Relationship logged
   - One-click safe verification                   - Releasing Officer tracked
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                            [ MARK PRIZE AS CLAIMED ]
                            Receipt Issued | Audit Logged
```

#### Key Safeguards
- **Real-Time Toast Alerts:** A soft notification bell sounds at the Claims Desk the moment a new winner is confirmed on stage.
- **Dual Confirmation Prompt:** Prevents accidental double-taps on touchscreens.
- **Proxy Authorization Support:** Complete fields for proxy claimants (family members or co-teachers) with relationship tracking.
- **Forfeiture Mechanism:** Official logging of forfeited prizes with documented justification (e.g. failure to appear within grace period).

---

### Slide 11: Station 5 — Automated Print Queue
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           OFFICIAL WINNER STUB                               │
│  MUNICIPAL TEACHERS' DAY 2026 - MALUNGON                                    │
│  Winner: SANTOS, MARIA G.              Draw Batch: DRAW-0012                 │
│  District: NORTH DISTRICT              Prize: ₱10,000 CASH                   │
│  School: Malungon Central ES           Timestamp: 10:45 AM                   │
│  Verification Code: [ QR CODE HASH ]   Disbursing Officer: ________________  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Printable Documents Generated
1. **Winner Verification Stubs:** Compact slip given to the winner or runner to bring to the claims booth.
2. **Official Claim Slip Receipt:** 2-part acknowledgment receipt signed by the teacher and disbursing officer.
3. **Batch Print Document:** Full sheet listing all winners of a particular prize round for posting on transparency boards.
4. **Queue Management:** Displays pending vs. printed counts so no winner slip is missed.

---

### Slide 12: Audit, Reports & Official Transparency
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    EXECUTIVE AUDIT & ANALYTICS SUMMARY                       │
├──────────────────────────┬──────────────────────────┬────────────────────────┤
│ Total Registered: 2,145  │ Checked-In Gate: 2,012   │ Attendance Rate: 93.8% │
│ Eligible Pool: 1,890     │ Total Winners: 125       │ Claim Rate: 98.4%      │
│ Total Prizes: 125 units  │ Disbursed Value: ₱450,000│ Outstanding: 2 stubs   │
└──────────────────────────┴──────────────────────────┴────────────────────────┘
```

#### Committee Reporting Capabilities
- **District Winner Distribution Breakdown:** Shows exact counts of winners for North, East, West, South, and Private to verify balanced representation.
- **Immutable Raffle Log:** Records Log ID, Draw Number, Timestamp, Prize Name, Eligible Pool Size, Winner IDs, and Admin Account for every single round.
- **One-Click COA / LGU Audit Printout:** Generates a formal, printable Letter-sized audit report formatted for official submission to the Municipal Mayor, Vice Mayor, Sangguniang Bayan, and DepEd Division Office.

---

### Slide 13: Dual-Engine Architecture
```
┌──────────────────────────────────────┐  ┌─────────────────────────────────────┐
│      ENGINE A: MODERN WEB APP        │  │   ENGINE B: GOOGLE APPS SCRIPT      │
│   (Next.js 15 + Supabase Cloud)      │  │      (Zero-Cost Google Sheets)      │
├──────────────────────────────────────┤  ├─────────────────────────────────────┤
│ • Real-time cross-device sync        │  │ • 100% native inside Google Drive   │
│ • Hardware scanner & webcam QR       │  │ • Zero servers, zero hosting costs   │
│ • Synthesized audio & particle FX    │  │ • Spreadsheet is the live database  │
│ • High-definition projector layout   │  │ • Deployed in 5 minutes via web app │
│ • Complete offline local caching     │  │ • Ideal backup and institutional log│
└──────────────────────────────────────┘  └─────────────────────────────────────┘
```

#### Why Dual-Engine?
The committee is never locked in. If high-speed cloud infrastructure is active, Engine A delivers a TV-broadcast-quality experience. If the venue has limited infrastructure, Engine B runs entirely out of a standard Google Sheet that every DepEd teacher is already familiar with.

---

### Slide 14: Offline Resilience & Emergency Contingencies
```
┌───────────────────────────────────┬──────────────────────────────────────────┐
│ SCENARIO                          │ BUILT-IN SYSTEM FAILSAFE                 │
├───────────────────────────────────┼──────────────────────────────────────────┤
│ Venue Wi-Fi drops completely      │ App continues seamlessly in Offline Mode │
│                                   │ using encrypted browser LocalStorage.    │
├───────────────────────────────────┼──────────────────────────────────────────┤
│ Laptop battery dies or shuts down │ State restores instantly on reboot;      │
│                                   │ pending draws are recovered automatically│
├───────────────────────────────────┼──────────────────────────────────────────┤
│ Teacher badge QR gets damaged     │ Instant instant search by DepEd ID or    │
│                                   │ Name at any gate or claims station.      │
├───────────────────────────────────┼──────────────────────────────────────────┤
│ Drawn winner is absent/ineligible │ Redraw button discards draw without      │
│                                   │ altering inventory or participant state. │
└───────────────────────────────────┴──────────────────────────────────────────┘
```

---

### Slide 15: Roles, Assignments & Event Timeline

#### Recommended Committee Staffing
| Role | Person Count | Responsibility |
|---|---|---|
| **System Lead & Stage Controller** | 1 Officer | Operates Master Admin, triggers draws, oversees LED wall |
| **LED Display Technician** | 1 Officer | Manages projector resolution, audio feed, and fullscreen mode |
| **Pre-Draw Committee** | 2 Officers | Conducts pre-draw rounds for minor prizes, signs batch logs |
| **Gate Attendance Officers** | 4–6 Officers | Stationed at Main Entrance with QR scanners & barcode guns |
| **Claims & Disbursing Officers** | 3–4 Officers | Validates IDs, issues physical prizes, prints claim stubs |
| **Audit & Transparency Leads** | 2 Observers | DepEd District Supervisor & LGU Auditor inspecting live logs |

#### Event Day Execution Timeline
- **06:30 AM – 08:00 AM:** Gate Registration & QR Scanning at Malungon Gym entrances.
- **08:00 AM – 09:30 AM:** Pre-Draw Station processes minor consolation prizes in the committee secretariat room.
- **09:30 AM – 11:30 AM:** Morning Program & Minor Prize batch announcements.
- **01:00 PM – 03:30 PM:** Live Stage Raffle Draws for Major and Grand Prizes on the LED Wall.
- **03:30 PM – 05:00 PM:** Claims Desk prize disbursements, sign-offs, and final audit report printing.

---

### Slide 16: Frequently Asked Questions & Open Forum

**Q1: Can someone win twice?**  
*Answer:* No. By default, once a teacher wins, their profile is marked as a winner and automatically excluded from all succeeding draws. If the committee chooses to allow multiple wins for minor prizes, a simple switch in Settings can enable it.

**Q2: Are Non-Teaching personnel eligible?**  
*Answer:* The system automatically profiles both Teaching and Non-Teaching personnel. Under the default DepEd Teachers' Day rules, only Teaching personnel enter the raffle pool. Non-Teaching personnel receive badges and attendance credit, but are safely filtered out of the raffle draw.

**Q3: Can a teacher send a representative to claim their prize?**  
*Answer:* Yes. The Claims Station has an official **Proxy Claim Mode** that records the proxy's name, relationship, and authorization note for audit compliance.

**Q4: What if an unauthorized person tries to access the admin controls?**  
*Answer:* All critical stations (Master Admin, Gate Attendance, and Claims Workstation) are locked with secure PIN authentication (default: `2026`).

---
*Municipal Teachers' Day 2026 — Honoring Our Educators with Integrity, Excellence, and Transparency.*
