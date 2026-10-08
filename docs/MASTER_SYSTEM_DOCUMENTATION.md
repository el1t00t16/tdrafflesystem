# 📘 Municipal Teachers' Day 2026 Raffle System
## Complete Master System Documentation & Architectural Manual
**Municipality of Malungon, Province of Sarangani, Region XII, Philippines**  
*Comprehensive Technical Architecture, Operating Protocols, Business Rules, and Administrative Guide*

---

## 📑 Table of Contents

1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Technology Stack & Key Libraries](#3-technology-stack--key-libraries)
4. [Data Models & Schema Specifications](#4-data-models--schema-specifications)
5. [Core Business Logic & Rules Engines](#5-core-business-logic--rules-engines)
   - [5.1 The 5-District Classification & Routing Engine](#51-the-5-district-classification--routing-engine)
   - [5.2 Personnel Type Isolation (Teaching vs. Non-Teaching)](#52-personnel-type-isolation-teaching-vs-non-teaching)
   - [5.3 Smart 4-Tier Duplicate Resolution Engine](#53-smart-4-tier-duplicate-resolution-engine)
   - [5.4 Mathematical Fairness & Random Drawing Algorithm](#54-mathematical-fairness--random-drawing-algorithm)
   - [5.5 Two-Stage Confirmation & Zero-Side-Effect Redraws](#55-two-stage-confirmation--zero-side-effect-redraws)
6. [Operational Stations & Workstation Modules](#6-operational-stations--workstation-modules)
   - [6.1 Gate Attendance & Fast Check-In Desk (`/attendance`)](#61-gate-attendance--fast-check-in-desk-attendance)
   - [6.2 Stage Projector & LED Wall Presentation (`/`)](#62-stage-projector--led-wall-presentation-)
   - [6.3 Pre-Draw Station for Minor Prizes (`/admin` -> Pre-Draw)](#63-pre-draw-station-for-minor-prizes-admin---pre-draw)
   - [6.4 Real-Time Claims & Disbursement Workstation (`/claims`)](#64-real-time-claims--disbursement-workstation-claims)
   - [6.5 Automated Print Queue Station (`/admin` -> Print Queue)](#65-automated-print-queue-station-admin---print-queue)
   - [6.6 Master Admin Console, Telemetry & Audit Logs (`/admin`)](#66-master-admin-console-telemetry--audit-logs-admin)
7. [Sound & Visual Experience Engines](#7-sound--visual-experience-engines)
8. [Data Persistence, Cloud Synchronization & Offline Failover](#8-data-persistence-cloud-synchronization--offline-failover)
9. [Security Protocols & Role-Based Access](#9-security-protocols--role-based-access)
10. [Step-by-Step Event Day SOP & Timeline](#10-step-by-step-event-day-sop--timeline)
11. [Troubleshooting & Emergency Failover Matrix](#11-troubleshooting--emergency-failover-matrix)

---

## 1. Executive Summary & Purpose

The **Municipal Teachers' Day 2026 Raffle System** is a purpose-built, audit-ready, and high-performance digital event platform engineered for the Municipality of Malungon, Sarangani Province. Built to serve over **2,000 public and private educators**, the platform eliminates the chaos, physical fatigue, and auditing vulnerabilities associated with traditional manual paper tambiolo draws.

### Core Objectives:
1. **Absolute Mathematical Fairness:** Single un-tampered candidate pool governed by the unbiased Fisher-Yates shuffle algorithm.
2. **Dynamic Stage Presentation:** Panoramic 2-2-1 district visual layout and single-winner Hero spotlight designed for massive gymnasium LED walls.
3. **Multi-Station Real-Time Collaboration:** Synchronized gate check-in, live stage drawing, pre-draw batching, verification stub printing, and prize claim disbursing.
4. **Zero-Paperwork Verification:** Instant QR and barcode verification matching DepEd Employee IDs.
5. **Rock-Solid Fault Tolerance:** Hybrid Cloud (Supabase) + Local Cache architecture ensuring zero data loss even during venue power cuts or Wi-Fi dropouts.

---

## 2. High-Level System Architecture

The platform operates as a distributed multi-station network communicating through cloud web sockets with local fallback caching:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SUPABASE CLOUD POSTGRESQL                              │
│                                                                                        │
│   [participants]         [prizes]          [winners]         [attendance]     [logs]   │
└───────▲─────────────────────▲─────────────────▲────────────────────▲────────────▲──────┘
        │                     │                 │                    │            │
        │ Realtime Channel    │ REST Sync       │ Realtime Channel   │ Webhook    │ Audit Trail
        │                     │                 │                    │            │
┌───────┴──────────────┐ ┌────┴────────────┐ ┌──┴───────────────┐ ┌──┴────────────┴─────┐
│   GATE ATTENDANCE    │ │  STAGE DRAWING  │ │    REAL-TIME     │ │     PRE-DRAW &      │
│     WORKSTATION      │ │   CONTROLLER    │ │   CLAIMS DESK    │ │    PRINT QUEUE      │
│    (`/attendance`)   │ │      (`/`)      │ │   (`/claims`)    │ │    (`/admin`)       │
│                      │ │                 │ │                  │ │                     │
│ • Camera QR Scanner  │ │ • 2-2-1 Display │ │ • Live Alerts    │ │ • Minor Batches     │
│ • USB Barcode Gun    │ │ • Hero Spotlight│ │ • Stub QR Scan   │ │ • Winner Stubs      │
│ • Manual Fuzzy Search│ │ • Audio & FX    │ │ • Proxy Claims   │ │ • Batch Sheets      │
│ • Badge Printing     │ │ • Confirm/Redraw│ │ • Signed Receipt │ │ • Official Reports  │
└──────────────────────┘ └─────────────────┘ └──────────────────┘ └─────────────────────┘
```

---

## 3. Technology Stack & Key Libraries

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling & UI:** Tailwind CSS, Lucide React Icons
- **Database & Sync:** Supabase JS Client (`@supabase/supabase-js`)
  - PostgreSQL Relational Database
  - Realtime WebSockets for sub-second cross-station broadcasts
- **Audio Synthesizer:** HTML5 Web Audio API (100% Client-Side Procedural Audio Synthesis; no MP3 dependencies)
- **Visual Animation:**
  - Canvas Confetti (`canvas-confetti`)
  - CSS GPU Transitions & `requestAnimationFrame` Mechanical Reels
- **Hardware & Peripherals:**
  - `html5-qrcode` (webcam and tablet camera stream decoding)
  - HID Barcode Scanners (USB / Bluetooth 2D barcode reader input listeners)
  - Standard Browser Print API with custom `@media print` CSS templates

---

## 4. Data Models & Schema Specifications

The system is defined by strictly typed TypeScript interfaces (`lib/types.ts`):

### 4.1 Participant Record
```typescript
export interface Participant {
  id: string;                  // Profiling ID e.g. W-2026-49550
  depedId?: string;            // DepEd Employee Number
  timestamp?: string;          // Form timestamp
  lastName: string;
  firstName: string;
  middleName: string;
  suffix?: string;
  fullName: string;
  district: District;          // 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'PRIVATE'
  originalDistrict?: string;   // Raw parsed string
  personnelType: PersonnelType;// 'TEACHING' | 'NON-TEACHING'
  typeOfPersonnel?: string;    // Raw role description
  school: string;
  position: string;
  sex?: string;
  contactNumber: string;
  email?: string;
  eligible: EligibilityStatus; // 'ELIGIBLE' | 'INELIGIBLE'
  winner: YesNo;               // 'YES' | 'NO'
  claimed: YesNo;              // 'YES' | 'NO'
  attendedAt?: string;         // ISO timestamp of gate check-in
  attendedBy?: string;         // Name of gate marshal
  status: string;              // 'ACTIVE'
  createdAt: string;
}
```

### 4.2 Prize Specification
```typescript
export interface Prize {
  id: string;                  // e.g. 'P-001'
  name: string;                // e.g. '₱10,000 Cash Incentive'
  description: string;
  unitValue: number;           // Numeric PHP value
  quantity: number;            // Total units sponsored
  drawnQuantity: number;       // Units already drawn
  remainingQuantity: number;   // Available units left
  totalValue: number;          // unitValue * quantity
  status: PrizeStatus;         // 'AVAILABLE' | 'EXHAUSTED'
  category?: PrizeCategory;    // 'GRAND' | 'MAJOR' | 'MINOR' | 'CONSOLATION'
  isPreDraw?: boolean;         // Flagged for Secretariat Pre-Draw
}
```

### 4.3 Winner Record
```typescript
export interface Winner {
  winnerId: string;            // e.g. 'WN-0001'
  participantId: string;
  depedId?: string;
  name: string;
  district: District;
  school: string;
  position: string;
  prizeId: string;
  prizeName: string;
  unitValue: number;
  drawNumber: string;          // e.g. 'DRAW-0001'
  date: string;
  time: string;
  claimStatus: ClaimStatus;    // 'UNCLAIMED' | 'CLAIMED' | 'FORFEITED'
  claimedAt?: string;
  claimedBy?: string;          // Claims Officer Name
  idPresented?: string;        // ID details presented
  isProxyClaim?: boolean;      // True if claimed via representative
  proxyName?: string;
  proxyRelationship?: string;
  claimNotes?: string;
  forfeitedAt?: string;
  forfeitReason?: string;
  drawType?: DrawType;         // 'LIVE' | 'PRE_DRAW'
  isPrinted?: boolean;
  printedAt?: string;
  printedBy?: string;
}
```

---

## 5. Core Business Logic & Rules Engines

### 5.1 The 5-District Classification & Routing Engine
Teachers are routed into five visual districts using `determineParticipantDistrict()`:

1. **PSDS Routing Rule:**
   - Public Schools District Supervisors covering South & East are placed into **EAST**.
   - PSDS covering North & West are placed into **NORTH**.
2. **Private & Community Educators:**
   - Daycare Teachers (`ECCD`), Private Schools/Academies, and Local School Board (`LSB`) personnel are aggregated into **PRIVATE**.
3. **DepEd Geographic Districts:**
   - Standard public elementary and secondary schools route directly to **NORTH**, **EAST**, **WEST**, or **SOUTH**.

### 5.2 Personnel Type Isolation (Teaching vs. Non-Teaching)
- **Teaching Personnel:** Classroom teachers, Master Teachers, and Head Teachers who qualify for active raffle drawings.
- **Non-Teaching Personnel:** Administrative assistants, bookkeepers, security officers, nurses, and utility staff.
- **Enforcement:** The `isTeachingPersonnel()` and `isEligibleForDraw()` guards strictly isolate non-teaching staff from draw candidate pools. They can scan at gates and receive attendance badges, but will never appear on the raffle wheel.

### 5.3 Smart 4-Tier Duplicate Resolution Engine
To handle dual submissions or name variations across district lists, `duplicateChecker.ts` runs 4 detection routines:
- **Exact DepEd ID Match:** Matching employee IDs.
- **Exact Full Name Match:** Sanitized and diacritic-stripped name match.
- **Fuzzy Token Matching:** Identifies maiden vs. married surnames and transposed name tokens.
- **Contact Number Match:** Identifies duplicate registrations sharing the same mobile phone.
- **Automated Score Keeper:** The `scoreParticipant()` algorithm scores candidate profiles (attendance: +1000, winner: +5000, data completeness: +100), ensuring the most active record is preserved upon merge.

### 5.4 Mathematical Fairness & Random Drawing Algorithm
The system utilizes the unbiased **Fisher-Yates Shuffle Algorithm**:
$$\mathcal{O}(n) \text{ time complexity}$$
- Every eligible participant has an identical mathematical probability of being selected.
- Pools are dynamically filtered at the moment of draw trigger:
  - Must be marked `ELIGIBLE` or `attendedAt != null`.
  - Must have `winner == 'NO'` (unless `allowMultipleWins` is enabled).
  - Must be verified `TEACHING` personnel.

### 5.5 Two-Stage Confirmation & Zero-Side-Effect Redraws
When a draw is executed on stage, results remain in a **provisional state**:
- **Confirm Winners:** Writes to the database, decrements inventory, flags participant as winner, and pushes to Claims Desk.
- **Redraw Round:** Safely purges provisional winners from memory. Zero database mutations occur, allowing an immediate, tamper-proof redraw.

---

## 6. Operational Stations & Workstation Modules

### 6.1 Gate Attendance & Fast Check-In Desk (`/attendance`)
- **Direct Route:** `http://localhost:3000/attendance` (PIN: `2026`)
- **Webcam QR Reader:** Scans attendee QR badges via camera feed.
- **Hardware Barcode Gun Mode:** Instant keyboard-wedge listener processing sub-200ms scans.
- **Manual Search Fallback:** Instant search by surname or DepEd ID for attendees without physical badges.
- **Audible Verification:**
  - *Success Chime:* Valid entry; sets status to `PRESENT` and qualifies teacher for draws.
  - *Warning Buzz:* Duplicate alert displaying previous scan time and gate location.
- **Printable Badge Sheets:** Built-in generator printing 8 high-contrast QR badges per sheet.

### 6.2 Stage Projector & LED Wall Presentation (`/`)
- **Direct Route:** `http://localhost:3000`
- **Full Stage Mode:** Press `F11` for fullscreen and click "Toggle Full Stage" to hide administrative chrome.
- **2-2-1 Panoramic Grid:** Displays North, East, West, South, and Private simultaneously.
- **Single Winner Hero Spotlight:** Automatically expands into a full-screen cinematic showcase card for 1-of-1 Grand Prizes.
- **Draw Distribution Modes:**
  - `Combined Pool`: Pure probability across all checked-in teachers.
  - `Equal Per District`: Equal number of winners per district (e.g. 2 per district = 10 winners).
  - `Target District Exclusive`: Isolates draws to a single district for sponsor-specific awards.

### 6.3 Pre-Draw Station for Minor Prizes (`/admin` -> Pre-Draw)
- **Direct Route:** Admin Console -> Pre-Draw Tab
- **Purpose:** Executes high-volume minor prizes (e.g., 200 umbrellas, 50 rice cookers) rapidly off-stage.
- **Features:**
  - Fast batch execution (configurable 1-3 second reel durations).
  - Flags records with `draw_type = 'PRE_DRAW'`.
  - Generates signed batch certificates for auditorium bulletin boards.
  - Automatically notifies the Claims Desk in real time.

### 6.4 Real-Time Claims & Disbursement Workstation (`/claims`)
- **Direct Route:** `http://localhost:3000/claims` (PIN: `2026`)
- **Live Notifications:** Alerts chime instantly when new winners are committed on stage.
- **Search & Verification:** Look up winners by QR stub scan, surname, or DepEd ID.
- **Claim Handling:**
  - *Direct Claim:* Validates DepEd ID or Government ID.
  - *Authorized Proxy:* Logs proxy full name, relationship, and authorization notes.
  - *Forfeiture:* Marks prizes forfeited with mandatory audit justifications.
- **Signed Claim Slips:** Prints 2-part acknowledgment receipts for official physical handover.

### 6.5 Automated Print Queue Station (`/admin` -> Print Queue)
- **Direct Route:** Admin Console -> Print Queue Tab
- **Features:**
  - Automatically batches confirmed winners by draw round (`DRAW-0001`).
  - Prints individual **Winner Verification Stubs** containing security QR hashes.
  - Prints comprehensive **Batch Summary Sheets**.
  - Tracks print lifecycle (`isPrinted`, `printedAt`, `printedBy`).

### 6.6 Master Admin Console, Telemetry & Audit Logs (`/admin`)
- **Direct Route:** Admin Console (`/admin` or Admin Tab, PIN: `2026`)
- **Real-Time Telemetry:** Live stats on attendance turnout %, prize disbursement values, and claim rates.
- **District Fairness Breakdown:** Audits prize distribution equity across all 5 districts.
- **Tamper-Evident Audit Trail:** Immutable log of every spin, redraw, and confirmation with CSV export.
- **Official Print Report:** Executive letter-size report with signature lines for DepEd, LGU, and COA representatives.
- **Security & Settings:** Configurable event parameters, animation duration, sound toggles, and PIN updates.

---

## 7. Sound & Visual Experience Engines

### Procedural Web Audio Engine (`lib/sound.ts`)
Zero audio file downloads required. Built entirely on the HTML5 Web Audio API:
- `playTick()`: Crisp 1200Hz mechanical pulse for spinning reels.
- `playCountdownTick()`: Deep 350Hz alert pulse building audience anticipation.
- `playWinFanfare()`: Multi-oscillator 5-chord celebration fanfare.
- `playDuplicateAlarm()`: Low sawtooth dissonance warning against duplicate scans.

### Dynamic Visual FX (`lib/confetti.ts`)
- Canvas Confetti particle explosions showering the display upon reveal.
- High-framerate CSS transformations creating realistic mechanical reel spinning.

---

## 8. Data Persistence, Cloud Synchronization & Offline Failover

```
                      ┌────────────────────────────┐
                      │    USER ACTION / DRAW      │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │  WRITE TO LOCAL STORAGE    │ (Instant State &
                      │  (td26_cache & offline)    │  Crash Recovery)
                      └─────────────┬──────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │ Is Supabase Online? │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
                 [ YES ]                         [ NO ]
      ┌───────────────────────────┐   ┌───────────────────────────┐
      │   Execute Supabase REST   │   │ Queue for Background Sync │
      │   & Broadcast WebSockets  │   │ Continue Station Offline  │
      └───────────────────────────┘   └───────────────────────────┘
```

1. **Dual-Layer Architecture:** Local state is saved to encrypted browser storage before network transmission.
2. **Crash Resilience:** If a browser window closes mid-spin, the unconfirmed draw is restored from `td26_pending_draw_result` upon reload.
3. **Wi-Fi Loss Immunity:** If gymnasium network drops, gate scanners and stage draws continue operating locally with zero disruption.

---

## 9. Security Protocols & Role-Based Access

| Station | Path | Default PIN | Protected Actions |
|---|---|---|---|
| **Master Admin** | `/` (Admin View) | `2026` | Database import, Prize edit, Full Event Reset, Log purge |
| **Gate Desk** | `/attendance` | `2026` | Check-in modification, Attendance marking, Badge printing |
| **Claims Desk** | `/claims` | `2026` | Winner verification, Disbursement signing, Forfeitures |
| **Stage Projector**| `/` (Display) | None | Fullscreen display, live draw trigger |

> **Destructive Reset Safeguard:** Initiating a full event reset requires manual typing of the security confirmation phrase: `"RESET MALUNGON 2026"`.

---

## 10. Step-by-Step Event Day SOP & Timeline

```
06:00 AM ── Gate Attendance Stations boot up; barcode guns connected.
06:30 AM ── Arriving teachers scan badges at Gates 1-4; eligible pool populates.
08:00 AM ── Secretariat launches Pre-Draw Station; minor prizes drawn in batches.
09:00 AM ── Pre-draw batch lists printed and posted; Claims Desk begins releases.
10:30 AM ── Program commences; Projector switch to Stage Fullscreen.
11:00 AM ── Live Stage draws executed for Major Prizes (2-2-1 layout).
02:30 PM ── Grand Prize Draw (Single Winner Hero Spotlight).
04:00 PM ── Claims Desk finalizes disbursements; audit report exported and signed.
```

---

## 11. Troubleshooting & Emergency Failover Matrix

| Scenario | Symptom | Action Protocol |
|---|---|---|
| **Gym Wi-Fi Fails** | Cloud sync badge turns amber/offline | Continue operations as normal. System operates 100% offline via LocalStorage. Re-sync occurs automatically when connection resumes. |
| **Laptop Accidentally Restarts** | Browser window closed mid-draw | Reopen browser to `http://localhost:3000`. The system detects `td26_pending_draw_result` and restores the provisional draw for review. |
| **Unregistered Teacher Arrives** | Badge scan returns "Not Found" | Go to Gate Manual Tab -> Click "Add Participant" -> Enter DepEd ID and Name. Teacher is instantly badged and added to the eligible pool. |
| **Sound Not Playing on Projector** | Silent reel animation | Browsers require an initial user click to enable Web Audio. Click anywhere on the screen or verify the audio toggle icon in the toolbar. |
| **Exit Full Stage Mode** | Need to access Admin tabs from Projector | Press `Escape` key on the keyboard, or click the small "Exit Full Stage" button in the bottom utility toolbar. |

---
*Municipal Teachers' Day 2026 — Designed and Maintained with Integrity for Malungon, Sarangani Province.*
