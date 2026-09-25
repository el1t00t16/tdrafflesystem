# 📖 Municipal Teachers' Day 2026 Raffle System
## Standard Operating Procedures (SOP) & User Operations Manual
**Municipality of Malungon, Province of Sarangani**  
*Comprehensive operational guide for Committee Chairs, Stage Operators, Gate Marshals, and Claims Officers*

---

## 📑 Table of Contents

1. [System Introduction & Hardware Checklist](#1-system-introduction--hardware-checklist)
2. [Role-Based Access & Security PINs](#2-role-based-access--security-pins)
3. [Pre-Event Setup & Data Management](#3-pre-event-setup--data-management)
4. [Gate Attendance Station Operations](#4-gate-attendance-station-operations)
5. [Live Stage & Projector Operations](#5-live-stage--projector-operations)
6. [Pre-Draw Station Operations (Minor Prizes)](#6-pre-draw-station-operations-minor-prizes)
7. [Print Queue Station Operations](#7-print-queue-station-operations)
8. [Real-Time Claims Workstation Operations](#8-real-time-claims-workstation-operations)
9. [Reports & Audit Trail Generation](#9-reports--audit-trail-generation)
10. [Google Apps Script Standalone Mirror Setup](#10-google-apps-script-standalone-mirror-setup)
11. [Troubleshooting & Emergency Failovers](#11-troubleshooting--emergency-failovers)

---

## 1. System Introduction & Hardware Checklist

The Municipal Teachers' Day 2026 Raffle System is built to handle over **2,000 participants** across 5 distinct groupings:
- **North District**
- **East District**
- **West District**
- **South District**
- **Private / ECCD / LSB** (Private Schools, Daycare Teachers, Local School Board)

### 📋 Recommended Hardware Checklist

| Workstation | Recommended Equipment | Function |
|---|---|---|
| **Stage & Projector Control** | 1x Laptop (Core i5/Ryzen 5+, 8GB RAM, HDMI out) + 1x External LED Wall / Projector | Primary display and draw execution |
| **Stage Audio Feed** | 3.5mm Aux or Bluetooth connection to Gymnasium Audio Console | Delivers sound ticks, reel sound, and victory fanfare |
| **Gate Attendance Desks** | 2–4x Laptops or Tablets with webcams or USB 2D Barcode Guns | Entrance check-in of arriving teachers |
| **Pre-Draw Station** | 1x Laptop located in Committee Secretariat Room | Batch execution of minor consolation prizes |
| **Claims & Disbursing Desk** | 1–2x Laptops + 1x Desktop Laser/Inkjet Printer | Winner verification, claim slip printing, physical release |
| **Local Network / Wi-Fi** | 1x Dedicated 4G/5G Pocket Wi-Fi or Venue Router | Cloud synchronization across all active stations |

---

## 2. Role-Based Access & Security PINs

The system implements security locks to prevent accidental or unauthorized actions during the event.

| Station / View | Direct URL Path | Default Security PIN | Access Level |
|---|---|---|---|
| **Master Admin Console** | `/` (click Admin tab) | `2026` | Full Control (Settings, Reset, Database) |
| **Gate Attendance Station** | `/attendance` | `2026` | Check-in, Badge Print, Attendance Logs |
| **Prize Claims Desk** | `/claims` | `2026` | Winner Verification, Claim Release, Print Queue |
| **Projector Display** | `/` (Display view) | None (Public) | Fullscreen Stage Animation & Draw Review |

> [!TIP]
> Master Admin can modify the `gateAccessPin` and `adminAccessPin` at any time under **Settings > Security & PIN Configuration**.

---

## 3. Pre-Event Setup & Data Management

### 3.1 Importing the Participant Masterlist
1. Open the **Master Admin Console** (`/admin`).
2. Navigate to the **Participants** tab.
3. Click the **📥 Import CSV** button.
4. Prepare your CSV with standard DepEd columns:
   - `Participant ID` (e.g. `TD26-0001` or Profiling ID `W-2026-XXXXX`)
   - `DepEd ID` (Employee Number)
   - `First Name`, `Middle Name`, `Last Name`
   - `District` (`NORTH`, `SOUTH`, `EAST`, `WEST`, `PRIVATE`)
   - `Personnel Type` (`TEACHING` or `NON-TEACHING`)
   - `School`
   - `Position`
   - `Contact Number`
5. Click **Process & Upload**. The system validates rows and flags formatting errors.

### 3.2 Resolving Duplicate Entries
1. On the **Participants** tab, look for the **Duplicate Alert Banner** or click **🔍 Duplicate Resolution**.
2. The system scans the database using 4 detection criteria:
   - **Exact DepEd ID Match:** Identical employee numbers registered twice.
   - **Exact Full Name Match:** Identical surname, first name, and middle name.
   - **Fuzzy Name Match:** Similar names with typos or maiden vs. married surname variations.
   - **Contact Number Match:** Identical mobile numbers registered under different names.
3. For each detected cluster, click **Merge Records**:
   - Choose the Primary record to keep.
   - Preserves historical attendance or winning records automatically.
   - Permanently discards the duplicate secondary record.

### 3.3 Staging the Prize Catalog
1. Navigate to the **Prizes** tab in Admin.
2. Review seeded prizes or click **➕ Add Prize**.
3. Fill out the prize specification:
   - **Prize ID:** e.g., `P-001`
   - **Prize Name:** e.g., `₱10,000 Cash Incentive` or `55-inch Smart 4K TV`
   - **Category:** `GRAND`, `MAJOR`, `MINOR`, or `CONSOLATION`
   - **Unit Value:** Numeric amount in Philippine Pesos (₱)
   - **Total Quantity:** Number of units sponsored
   - **Pre-Draw Eligible:** Check **YES** if this prize should be drawn at the Pre-Draw station.
4. Click **Save Prize**.

### 3.4 Printing Attendee Badges
1. Go to **Attendance > Printable Badges** (`/attendance`).
2. Filter badges by **District** or **School**.
3. Select your desired layout (Standard 8-badges per sheet with high-contrast QR codes).
4. Click **Print Sheet** and distribute badges to schools prior to Teachers' Day.

---

## 4. Gate Attendance Station Operations

The Gate Attendance Module checks in arriving teachers and qualifies them for the raffle.

### 4.1 Logging into the Gate Station
1. On the Gate laptop or tablet, open: `https://your-app-domain.com/attendance`
2. Enter the Station Identifier (e.g. `Gate 1 - Gym Main Lobby`).
3. Enter the Officer Name (e.g. `Teacher Joy / Registration Committee`).
4. Enter the Gate PIN: `2026`.
5. Click **Authenticate & Open Gate**.

### 4.2 Check-In Operating Modes

#### Mode 1: Built-in Camera QR Scanning
- Select the **Camera** tab.
- Click **Start Camera**. (Allow browser camera permissions if prompted).
- Point the teacher's badge QR code at the camera.
- The system immediately verifies:
  - 🔔 **Chime & Green Banner:** Valid first-time entry. Displays Teacher Name, School, and District.
  - ⚠️ **Buzz & Amber Banner:** Duplicate entry! Displays: *"Already Scanned at Gate 2 at 7:22 AM"*.

#### Mode 2: Hardware Barcode Scanner Gun
- Connect your USB or Bluetooth 2D barcode scanner gun.
- Click on the **Barcode Gun** tab (ensure the cursor is active in the scan input field).
- Scan the teacher's badge. Scans process in under 200 milliseconds.

#### Mode 3: Manual Search (Forgot Badge Fallback)
- If a teacher forgot or damaged their badge, switch to the **Manual** tab.
- Type their **Surname**, **DepEd ID**, or **School**.
- Find their entry in the instant result list.
- Click **Mark Present (Check-In)**.

---

## 5. Live Stage & Projector Operations

### 5.1 Projector & Screen Configuration
1. Connect the Stage Laptop to the Gym LED Wall or Projector via HDMI.
2. In Windows Display Settings, choose **Extend these displays** (Recommended) or **Duplicate**.
3. Open the browser and navigate to: `https://your-app-domain.com`
4. Set the view to **Projector Display**.
5. Click the **Fullscreen** button (or press `F11`).
6. Click **Toggle Full Stage** (this hides the administrative navigation bar, showing only the majestic 2-2-1 district cards and active prize banner).

### 5.2 Performing a Live Raffle Draw
1. Select the prize to draw from the **Prize Selector** dropdown.
2. Choose the **Distribution Mode**:
   - **Combined Pool (Default):** Draws winners randomly from all eligible teachers across the municipality.
   - **Equal Per District:** Draws an equal specified number of winners from each of the 5 districts simultaneously.
   - **Target District:** Draws winners exclusively from one selected district (e.g. for district-sponsored awards).
3. Set the **Winners Count** (e.g. 1 for Grand Prize, 5 for Major Prizes).
4. Click **Commence Draw →**.
5. The **Draw Preview Modal** opens, summarizing:
   - Total eligible teachers in the pool.
   - Distribution breakdown.
   - Click **Start Live Draw**.

### 5.3 The Visual Draw Experience
- All 5 district cards (or the Single Hero Card) begin cycling rapidly with candidate names.
- Mechanical audio clicks build tension in the gym.
- An animated countdown triggers: **3... 2... 1...**
- The winning name(s) snap into place in bold uppercase with school and district tags.
- Sound fanfare plays and a multi-color canvas confetti shower bursts across the screen!

### 5.4 Two-Stage Confirmation (Confirm vs. Redraw)
After the animation finishes, the **Draw Review Modal** appears on the controller's screen:
- **Option A: ✓ CONFIRM WINNERS**
  - Officially writes the winners to the database.
  - Decrements the remaining prize quantity.
  - Marks the participants as `Winner = YES`.
  - Pushes the winners to the live Claims Desk and Print Queue.
  - Adds an immutable entry to the Raffle Audit Log.
- **Option B: 🔄 REDRAW ROUND**
  - Used if a drawn participant is absent (if physical attendance is strictly enforced) or disqualified.
  - Safely discards the provisional names without altering any database records.
  - You can immediately trigger a clean redraw.

---

## 6. Pre-Draw Station Operations (Minor Prizes)

To prevent the stage program from dragging on for hours, minor items (e.g., 200 umbrellas, 100 electric fans, 50 grocery packs) are handled at the **Pre-Draw Station**.

1. In the Admin Dashboard, click the **Pre-Draw Station** tab (`/admin`).
2. Select the minor prize from the catalog.
3. Configure the batch quantity (e.g., 20 winners).
4. Set the **Reel Duration** (recommended: 3 seconds for fast batching).
5. Click **Draw Batch**.
6. The system executes the Fisher-Yates draw and displays the provisional batch.
7. Click **Confirm & Commit Batch**:
   - Winners are saved with `draw_type = 'PRE_DRAW'`.
   - The batch is pushed to the Print Queue and Claims Desk.
8. Click **Print Batch Document** to produce an official signed sheet for posting on the auditorium bulletin boards.

---

## 7. Print Queue Station Operations

The Print Queue Station prevents lost paperwork and ensures every winner receives an official physical claim slip.

1. Navigate to the **Print Queue** tab in Admin (or open it from `/claims`).
2. Winners are grouped by **Raffle Batch** (`DRAW-0001`, `DRAW-0002`, etc.).
3. Two printing options:
   - **Print Batch Document:** Prints an official tabular summary of all winners in that draw round.
   - **Print Single Winner Stub:** Generates a compact official stub containing:
     - Winner Full Name, ID, District, School, and Position.
     - Prize Name and Unit Value.
     - Draw Batch Number and exact Timestamp.
     - Security QR Code verification hash.
4. Once printed, click **Mark as Printed** to keep the queue clean and up to date.

---

## 8. Real-Time Claims Workstation Operations

The Claims Desk verifies winners and releases physical prizes.

### 8.1 Logging into the Claims Station
1. On the Claims laptop, open: `https://your-app-domain.com/claims`
2. Enter Station ID (e.g., `Claims Desk A - Gymnasium North Wing`).
3. Enter Disbursing Officer Name (e.g., `Mr. Rey Garcia / Claims Committee`).
4. Enter PIN: `2026`.

### 8.2 Processing a Prize Claim

#### Scenario A: Direct Claim (Teacher in Person)
1. The teacher presents their DepEd Employee ID, PRC License, or Gov ID.
2. Locate the winner in the Claims Workstation:
   - Scan their Winner Verification Stub QR code using the webcam or barcode gun; OR
   - Type their Surname or DepEd ID in the search box.
3. Click on the winner's record to open the **Verification Card**.
4. In the **ID Presented** box, enter the ID details (e.g., `DepEd ID # 4829101`).
5. Click **Verify & Confirm Disbursement**.
6. The system sets `claimStatus = 'CLAIMED'` and timestamps the releasing officer.
7. Click **Print Claim Slip Receipt** for the teacher to sign as formal proof of receipt.

#### Scenario B: Authorized Proxy Claim
1. If an absent teacher sent an authorized representative:
2. In the Verification Card, toggle **Proxy Claim: YES**.
3. Enter:
   - **Proxy Full Name**
   - **Relationship to Winner** (e.g., *Co-Teacher / School Head / Spouse*)
   - **Authorization Notes** (e.g., *Presented Signed Authorization Letter + Photocopy of ID*)
4. Click **Verify & Confirm Disbursement**.
5. Print the 2-part acknowledgment receipt for the proxy to sign.

#### Scenario C: Prize Forfeiture
1. If a winner fails to claim within the announced grace period or declines the prize:
2. Click **Forfeit Prize**.
3. Select or enter the **Mandatory Forfeiture Justification** (e.g., *Unclaimed after 3 announcements / Ineligible non-teaching entry*).
4. The item is marked `FORFEITED` and can be re-added to inventory by the Committee Lead.

---

## 9. Reports & Audit Trail Generation

1. Navigate to the **Reports** tab in Admin.
2. The system calculates live analytics:
   - **Attendance Turnout:** Total registered vs. verified attendees at gates.
   - **Total Prize Units & Valuation:** Total peso amount distributed.
   - **Claim Rate:** Percentage of prizes claimed vs. pending stubs.
   - **District Fairness Breakdown:** Graphic and tabular distribution of prizes won across North, East, West, South, and Private.
3. Click **🖨️ Print Official Report**:
   - Automatically formats into an executive letter-sized summary.
   - Contains designated signature lines for:
     - Committee Chairperson
     - DepEd District Supervisors
     - Municipal LGU / COA Representative

---

## 10. Google Apps Script Standalone Mirror Setup

If the committee prefers to run entirely within **Google Workspace** (with zero servers or cloud database), the system includes a complete standalone Google Apps Script version located in the `gas/` directory.

### Quick 5-Minute Setup:
1. Open a blank Google Sheet at [sheets.new](https://sheets.new).
2. Go to **Extensions > Apps Script**.
3. Copy code from the project:
   - Paste `gas/Code.gs` into the script editor.
   - Click `+` > HTML, create a file named `Index`, and paste `gas/Index.html`.
   - Click `+` > Script, create `SetupSheets.gs`, and paste `gas/SetupSheets.gs`.
4. In the function dropdown, select `runInitialSetup` and click **Run**. Grant permissions.
5. All 5 sheets (`PARTICIPANTS`, `PRIZES`, `WINNERS`, `RAFFLE_LOG`, `SETTINGS`) will be automatically generated with styled headers!
6. Click **Deploy > New Deployment > Web App**. Set access to **Anyone**.
7. Open the generated URL:
   - Projector: `.../exec?page=raffle`
   - Admin Controller: `.../exec?page=admin`

---

## 11. Troubleshooting & Emergency Failovers

### Q1: The Gymnasium Wi-Fi disconnects during the event. What happens?
- **Automatic Fallback:** The web app operates seamlessly in **Offline Mode**.
- All participants, prizes, and draw results are cached in the browser's encrypted `localStorage`.
- You can continue drawing, scanning, and claiming prizes without interruption.
- Once Wi-Fi reconnects, changes sync automatically to the cloud.

### Q2: A laptop accidentally restarts or loses power mid-draw.
- **Crash Recovery:** The system continuously saves pending unconfirmed draws under `td26_pending_draw_result`.
- Upon rebooting and reopening the app, the pending draw is restored immediately. You can confirm or redraw without losing data.

### Q3: An unprofiled teacher arrives at the gate without an ID in the database.
- Go to **Participants > ➕ Add Participant**.
- Enter their DepEd ID, Full Name, School, and District.
- Click **Save**. They are immediately registered, marked present, and added to the eligible raffle pool.

### Q4: How do we exit Full Stage mode on the projector?
- Simply press the **`Escape`** key on the keyboard, or click the **Exit Full Stage** button in the lower toolbar.

---
*Municipal Teachers' Day 2026 — Malungon, Sarangani Province*  
*Empowering Our Educators Through Trust, Technology, and Integrity.*
