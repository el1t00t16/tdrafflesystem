# 🔄 Municipal Teachers' Day 2026 Raffle System
## End-to-End Operational Workflow & Architecture Guide
**Municipality of Malungon, Sarangani Province**

---

## 🧭 System Workflow Overview

The raffle system executes across **Five Defined Operational Phases**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: PRE-EVENT PREPARATION & DATA INGESTION                             │
│ Masterlist Upload ──► Duplicate Resolution ──► Badge Generation ──► Staging │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: EVENT-DAY GATE ATTENDANCE & CHECK-IN                               │
│ Teacher Arrival ──► QR / Barcode Scan ──► Database Update: PRESENT/ELIGIBLE │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: RAFFLE DRAWING (STAGE & PRE-DRAW)                                  │
│ Prize Selection ──► Animated Shuffle ──► 2-Stage Verification ──► Confirm   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: PRIZE CLAIMING, VERIFICATION & DISBURSEMENT                        │
│ Print Queue ──► Winner Verification Stub ──► ID Check ──► Claim Receipt    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: POST-EVENT AUDIT, REPORTING & ARCHIVAL                             │
│ Log Verification ──► District Analytics ──► Formal COA/LGU Executive Report │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Phase-by-Phase Detailed Workflow

### Phase 1: Pre-Event Preparation & Data Ingestion

```
[ DepEd District Rosters ] ──► [ Excel / CSV File ] ──► [ System Bulk Import ]
                                                               │
                                                               ▼
                                               [ Smart Duplicate Resolution ]
                                               - Exact DepEd ID Match
                                               - Fuzzy Name Matching
                                               - Auto-Merge Tool
                                                               │
                                                               ▼
                                                [ District Auto-Classification ]
                                                - North, East, West, South
                                                - Private / ECCD / LSB
                                                - PSDS Routing
                                                               │
                                                               ▼
                                                [ Generate Printable QR Badges ]
                                                - 8-per-sheet printable cards
                                                - Distributed prior to event
```

#### Step-by-Step Operations:
1. **Masterlist Ingestion:**
   - The Committee Secretariat receives official rosters from North, East, West, South, and Private school heads.
   - Files are saved as CSV and imported via the **Participants Manager** tab (`/admin`).
2. **Automated District & Personnel Routing:**
   - The system automatically parses each teacher into one of 5 visual districts:
     - `NORTH`, `EAST`, `WEST`, `SOUTH`, or `PRIVATE`.
     - PSDS entries covering South & East are placed into `EAST`; PSDS covering North & West into `NORTH`.
     - Daycare (ECCD), Private schools, and Local School Board (LSB) teachers are placed into `PRIVATE`.
   - Distinguishes **Teaching Personnel** (eligible for raffle) from **Non-Teaching Personnel** (profiled for attendance/badges, excluded from draw pool).
3. **Duplicate Resolution:**
   - Run the built-in **Duplicate Resolution Modal**.
   - Review exact and fuzzy matches (teachers registered twice due to maiden/married name variations or re-submissions).
   - Use the **One-Click Merge** tool to combine history into a single clean participant profile.
4. **Prize Catalog Staging:**
   - Under the **Prizes Manager** tab, stage all sponsored items.
   - Assign categories: `GRAND`, `MAJOR`, `MINOR`, or `CONSOLATION`.
   - Set unit cash values and total quantities.
   - Designate whether a prize is eligible for the **Pre-Draw Station**.
5. **Print Badge Sheets:**
   - Open **Printable Badge Sheets** under Gate Attendance.
   - Print high-contrast QR badges (8 per sheet) sorted by district and school for distribution to teachers.

---

### Phase 2: Event-Day Gate Attendance & Check-In

```
   [ Teacher Enters Malungon Gym ]
                  │
                  ▼
      [ Approaches Gate 1 - 4 ]
                  │
                  ▼
         [ Scan QR / Barcode ]
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
[ QR Recognized ]     [ Unreadable / Forgotten ]
      │                       │
      │                       ▼
      │             [ Manual Search by Name / DepEd ID ]
      │                       │
      └───────────┬───────────┘
                  │
                  ▼
      [ System Checks Record ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
[ FIRST-TIME SCAN ]   [ DUPLICATE SCAN ]
   Status -> PRESENT    Warning Alert Chime
   Added to Eligible    "Already Checked-In at
   Raffle Pool!          Gate 2 at 7:15 AM"
   Audited Timestamp    Entry Rejected
```

#### Multi-Gate Infrastructure:
- Multiple laptop/tablet gates can operate simultaneously using the standalone route:
  `https://your-domain.com/attendance`
- **Station Authentication:** Gate marshals authenticate with the Gate Access PIN (`2026`).
- **Live Sync:** Each scan instantly updates the cloud database (`attended_at`, `attended_by`, `station_id`).
- **Offline Protection:** If the gym Wi-Fi fluctuates, local storage preserves the check-in and queues background sync upon reconnection.

---

### Phase 3: Raffle Drawing Workflow (Stage & Pre-Draw)

```
                       [ ADMIN SELECTS PRIZE ]
                                  │
                                  ▼
                    [ CHOOSE DISTRIBUTION MODE ]
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
   [ COMBINED POOL ]    [ EQUAL PER DISTRICT ]    [ TARGET DISTRICT ]
   Natural probability   e.g., 2 per district      Single district only
   across all teachers   = 10 total winners        (redraws or sponsors)
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                                  ▼
                   [ CLICK: "COMMENCE DRAW" ]
                                  │
                                  ▼
                      [ DRAW PREVIEW MODAL ]
            Validates eligible pool size & exclusions
                                  │
                                  ▼
                   [ CLICK: "START LIVE DRAW" ]
                                  │
                                  ▼
            ┌───────────────────────────────────────────┐
            │       STAGE ANIMATION ON PROJECTOR        │
            │ • Rapid mechanical name reel              │
            │ • Audio sound ticks & rolling reel        │
            │ • Dramatic Countdown: "3... 2... 1..."    │
            │ • High-contrast name reveal               │
            │ • Colorful canvas confetti explosion      │
            └─────────────────────┬─────────────────────┘
                                  │
                                  ▼
                   [ TWO-STAGE CONFIRMATION MODAL ]
                                  │
               ┌──────────────────┴──────────────────┐
               ▼                                     ▼
      [ ✓ CONFIRM WINNERS ]                   [ 🔄 REDRAW ROUND ]
               │                                     │
               ▼                                     ▼
    - Winner table updated                 - Provisional names discarded
    - Participant marked WINNER = YES      - Zero database modification
    - Prize remaining qty decremented      - Ready for fresh draw
    - Audit log permanently saved
    - Auto-pushed to Print Queue & Claims
```

#### Two Distinct Drawing Channels:
1. **Live Stage Controller (`/` Projector Display):**
   - Reserved for Grand Prizes and Major Cash/Appliance drawings.
   - Features the full-screen 2-2-1 layout or the Single Winner Hero Spotlight.
   - Driven by the MC and audience countdown.
2. **Pre-Draw Station (`/admin` -> Pre-Draw Tab):**
   - Conducted by the Secretariat in the presence of designated audit witnesses.
   - Processes batches of 10 to 50 minor prizes (e.g. rice cookers, umbrellas, grocery packs).
   - Generates official batch certificates and immediately sends names to the Claims Desk.

---

### Phase 4: Prize Claiming, Verification & Disbursement

```
                [ WINNER RECORD CONFIRMED ON STAGE ]
                                  │
                                  ▼
                     [ AUTOMATIC CLOUD SYNC ]
          Real-time alert sounds at Claims Workstation Desk
                                  │
                                  ▼
            [ PRINT QUEUE STATION GENERATES DOCUMENTS ]
          - Official Winner Verification Stub (with QR hash)
          - Official Claim Slip Receipt
                                  │
                                  ▼
                  [ WINNER VISITS CLAIMS BOOTH ]
                                  │
                                  ▼
                [ CLAIMS OFFICER SCANS WINNER STUB ]
                                  │
                     [ VERIFY IDENTIFICATION ]
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
   [ PERSONAL CLAIM ]                              [ PROXY CLAIM ]
   - Presents DepEd ID / Gov ID                    - Authorization Letter verified
   - Photo / School Match Checked                  - Proxy Name & Relation recorded
          │                                               │
          └───────────────────────┬───────────────────────┘
                                  │
                                  ▼
                 [ SAFE DISBURSEMENT CONFIRMATION ]
                Officer clicks "Verify & Confirm Claim"
                                  │
                                  ▼
                     [ SYSTEM UPDATES STATUS ]
                 - Claim Status -> CLAIMED
                 - Claimed Timestamp & Officer Name saved
                 - Printed acknowledgment receipt signed
                 - Physical prize released to teacher!
```

#### Claims Workstation Features:
- Route: `https://your-domain.com/claims`
- **Instant Search & QR Scanner:** Quickly finds the winning record via barcode gun, webcam, or name query.
- **Accidental Click Safeguard:** Requires confirmation modal so officers don't accidentally mark wrong winners.
- **Forfeiture Logging:** If a winner cannot be verified or fails to present requirements, prize can be flagged `FORFEITED` with mandatory audit reason logging.

---

### Phase 5: Post-Event Audit, Reporting & Archival

```
                     [ CELEBRATION CONCLUDES ]
                                  │
                                  ▼
                 [ GENERATE EXECUTIVE SUMMARY ]
        - Total attendance turnout rate
        - Total prizes awarded vs. remaining inventory
        - Total peso valuation disbursed
                                  │
                                  ▼
                [ DISTRICT DISTRIBUTION VERIFICATION ]
        - North: X winners
        - East: Y winners
        - West: Z winners
        - South: W winners
        - Private/ECCD/LSB: V winners
                                  │
                                  ▼
                  [ EXPORT IMMUTABLE AUDIT TRAIL ]
        - Comprehensive CSV Export (Timestamped)
        - Official Printable Letter-Format PDF Report
        - Signed by Committee Chairperson, DepEd Supervisor,
          and Municipal Auditor
```

---

## 🖧 Real-Time Data Flow & Synchronization Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE CLOUD DATABASE                            │
│  [participants]      [prizes]      [winners]      [attendance]      [logs]  │
└──────▲──────────────────▲──────────────▲───────────────▲───────────────▲────┘
       │                  │              │               │               │
       │ Real-Time Socket │ REST Sync    │ Real-Time Pub │ Webhook Push  │ Audit
       │                  │              │               │               │
┌──────┴─────────┐ ┌──────┴────────┐ ┌───┴──────────┐ ┌──┴────────────┐ ┌┴────┴───────┐
│ GATE SCANNER   │ │ STAGE ADMIN   │ │ PROJECTOR    │ │ CLAIMS DESK   │ │ GOOGLE SHEETS │
│ LAPTOP / PHONE │ │ CONTROLLER    │ │ LED WALL     │ │ WORKSTATION   │ │ BACKUP MIRROR │
│                │ │               │ │              │ │               │ │               │
│ • Camera QR    │ │ • Prize Select│ │ • 2-2-1 Cards│ │ • Stub Lookup │ │ • Auto-sync   │
│ • Barcode Gun  │ │ • Draw Trigger│ │ • Single Hero│ │ • Proxy Entry │ │ • Zero-cost   │
│ • Manual Search│ │ • Redraw/Save │ │ • Confetti FX│ │ • Release Sign│ │   archive     │
└────────────────┘ └───────────────┘ └──────────────┘ └───────────────┘ └───────────────┘
```

---

## 🛡️ Security & Integrity Matrix

| Operational Checkpoint | Threat / Risk | Built-In System Control |
|---|---|---|
| **Gate Registration** | Duplicate entry or unregistered person | DepEd ID uniqueness check; duplicate scans trigger audible alarm. |
| **Eligibility Pool** | Non-teaching staff winning teacher raffle | Automatic `isTeachingPersonnel()` filter isolates teacher profiles. |
| **Draw Execution** | Inadvertent trigger or premature winner commit | Two-Stage Confirmation modal; results stay provisional until confirmed. |
| **Stage Redraws** | Redrawing corrupting prize counts | Redraw button completely purges provisional draw with zero database impact. |
| **Prize Claims** | Wrong person claiming high-value prize | DepEd ID verification, QR stub hashing, and proxy signature requirements. |
| **Network Loss** | Venue Wi-Fi outage during event | Automatic fallback to encrypted browser LocalStorage; zero data loss. |
| **Audit Compliance** | Allegations of manual tampering | Unbiased Fisher-Yates algorithmic shuffle; tamper-evident timestamped logs. |

---
*Municipal Teachers' Day 2026 — Designed for Flawless Execution in Malungon.*
