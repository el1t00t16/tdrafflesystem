# 🍎 Municipal Teachers' Day 2026 Digital Raffle System
# 📋 Master Event-Day Preparation & Logistics Checklist
**Municipality of Malungon, Province of Sarangani**  
*A Complete Physical, Technical, and Operational Readiness Checklist for the Organizing Committee, Secretariat, Marshals, and Technical Staff*

---

## 🗺️ Master Preparation Timeline Overview

```
[ T-7 to T-1 Days ] ──► [ Thursday 2:00 PM ] ──► [ Friday 6:30 AM ] ──► [ Friday 7:35 AM ] ──► [ Friday 8:00 AM ] ──► [ Friday 4:30 PM ]
  Masterlist & Badges    Pre-Draw & Backup      Rehearsal Dry-Run      Dry-Run Reset          Gates & Stage           Audit Sign-off
```

---

## 1. Physical Hardware & Equipment Checklist

### 💻 A. Laptops & Computers
- [ ] **1x Main Stage Control Laptop:**
  - Recommended: Core i5 / Ryzen 5 or better, 8GB+ RAM.
  - Video output: HDMI port tested with Gymnasium LED Wall processor.
  - Audio output: 3.5mm Aux jack or Bluetooth tested with Gymnasium Sound Console.
  - Power brick & charger plugged into a wall outlet (do not run on battery alone).
- [ ] **2–4x Gate Attendance Laptops or Tablets:**
  - Placed at Gates 1, 2, 3, and 4 (Gymnasium Lobby, North, South, East Entrances).
  - Web browser installed (Google Chrome or Microsoft Edge updated to latest version).
  - Screen brightness set to maximum for easy daytime viewing.
- [ ] **1x Pre-Draw Secretariat Laptop:**
  - Located in the Committee Secretariat Office.
  - Connected to a standard office printer for immediate batch sheet printing.
- [ ] **1–2x Claims Desk Laptops:**
  - Stationed at the Gymnasium Side Claim Booths (Desk A: Minor Prizes, Desk B: Grand Prizes).
  - Connected to the Claim Receipt Printer.
- [ ] **1x Spare / Backup Laptop:**
  - Pre-configured with the raffle URL bookmarks and Chrome/Edge.

---

### 🔌 B. Cables, Audio & Networking
- [ ] **2x Heavy-Duty Extension Cords & Power Strips:**
  - 1 at Main Stage / AV Desk.
  - 1 at Gate Attendance Booths.
  - 1 at Claims & Secretariat Desks.
- [ ] **1x High-Speed HDMI Cable (10m–15m):**
  - Connected from Stage Laptop to Gymnasium LED Wall video processor.
- [ ] **1x 3.5mm Aux-to-XLR / Aux-to-RCA Audio Cable:**
  - Connected from Stage Laptop headphone jack to Gymnasium Audio Mixer.
- [ ] **2–4x 2D Barcode Scanner Guns (USB / Wireless):**
  - Tested to scan standard QR codes on badges within $<200\text{ms}$.
- [ ] **1–2x Backup 4G/5G Pocket Wi-Fi or LTE Mobile Hotspots:**
  - Loaded with active data load for venue synchronization.
  - *(Note: The system operates 100% offline; Wi-Fi is used for real-time multi-device cloud synchronization).*

---

### 🖨️ C. Printers & Peripherals
- [ ] **1x Desktop Laser / Inkjet Printer:**
  - Positioned at the Prize Claims Desk for printing 2-part official claim receipts.
  - USB printer cable connected or local Wi-Fi printer connected.
- [ ] **1x Office Printer at Secretariat Office:**
  - For printing Pre-Draw batch master sheets and bulletin board lists.
- [ ] **2x USB Flash Drives (FAT32/NTFS, 8GB+):**
  - Dedicated for storing the **Tier 1 `.json` Backup Files** (`TeachersDay2026_Backup_...json`).

---

## 2. Paper, Stationery & Physical Supplies Checklist

- [ ] **2 to 3 Reams of Letter-Size Bond Paper (8.5" x 11"):**
  - For printing claim receipts, winner verification stubs, and batch summary sheets.
- [ ] **Pre-Printed Attendee Badges:**
  - Pre-printed 8 badges per sheet from `/attendance ➔ Printable Badges`.
  - Cut and inserted into plastic badge holders/pouches with lanyards.
  - Distributed to school principals and district supervisors prior to Teachers' Day.
- [ ] **Official Audit Binders (2x Expandable Folders):**
  - **Binder 1:** Signed Part 2 Claim Receipts (Proof of Disbursement).
  - **Binder 2:** Official Pre-Draw & Stage Winner Summary Sheets with Supervisor signatures.
- [ ] **Office Supplies:**
  - 5x Black/Blue ballpoint pens for teacher and supervisor signatures.
  - 2x Staplers with extra staple bullets.
  - 2x Clipboards for gate marshals and stage coordinators.
  - 50x Long Brown Envelopes (for cash prizes and gift vouchers).

---

## 3. T-Minus 7 Days to T-Minus 1 Day: Pre-Event Data Checklist

- [ ] **Masterlist Verification:**
  - DepEd employee roster received from North, East, West, South, and Private/ECCD/LSB schools.
  - Roster columns formatted: `DepEd ID`, `Full Name`, `District`, `School`, `Position`, `Personnel Type` (`TEACHING` or `NON-TEACHING`).
- [ ] **Masterlist Upload:**
  - Uploaded via `Admin ➔ Participants ➔ Import CSV`.
- [ ] **4-Tier Duplicate Resolution Scan:**
  - Run `Admin ➔ Participants ➔ Duplicate Resolution`.
  - Check for Exact ID, Exact Name, Fuzzy Typo, and Mobile Number matches.
  - Merge duplicate records safely so teachers only have 1 entry.
- [ ] **Prize Catalog Staging:**
  - Input all prizes into `Admin ➔ Prizes`.
  - Verify Category flags: `GRAND` (Top Jackpots for Teachers only) vs `MINOR` (Appliances, Cash, Gifts for all personnel).
  - Verify `Pre-Draw Eligible` checkboxes on minor items.
  - Confirm total sponsored unit counts match physical warehouse deliveries.

---

## 4. Thursday 2:00 PM: Official Pre-Draw Checklist

* **Location:** Committee Secretariat Office  
* **Required Observers:** Committee Chair, DepEd District Supervisors (PSDS), and Audit Observers

- [ ] **Open Pre-Draw Station:**
  - Open `/admin`, enter PIN `2026`, navigate to **Pre-Draw Station**.
  - Verify total participants in pool.
- [ ] **Execute Minor Prize Batch Draws:**
  - Select minor prizes (e.g. 100 Fans, 50 Rice Cookers, 200 Grocery Packs).
  - Execute draws in batches of 10 to 50 names in front of witnesses.
  - Click **"Confirm & Commit Batch"** after each round.
- [ ] **CRITICAL: Lock Roster for Friday Gate:**
  - In the top purple banner of Pre-Draw Station, click:  
    👉 **"Prepare Roster for Gate"** (`Reset Non-winners for Gate`).
  - *Verify:* Thursday Pre-Draw winners stay locked (`WINNER = YES`). Remaining teachers switch to `INELIGIBLE` (must scan badges at gym gates tomorrow).
- [ ] **CRITICAL: Save the 3-Tier Backups:**
  - Click **"Save Snapshot"** *(Tier 2: Browser Memory Bookmark)*.
  - Click **"Download Backup (.json)"** *(Tier 1: Emergency Parachute File)*.
  - Copy the `.json` file to **USB Flash Drive #1, USB Flash Drive #2, and Google Drive**.
- [ ] **Print & Post Winner Sheets:**
  - Click **"Print Batch Document"**.
  - Have supervisors sign the sheets.
  - Post copies on Gymnasium announcement bulletin boards.

---

## 5. Friday 6:30 AM – 7:35 AM: Setup & Rehearsal Checklist

- [ ] **6:30 AM — Stage & AV Connection:**
  - Plug Stage Laptop into gym LED wall (HDMI).
  - Plug Stage Laptop audio output into gym mixer (Aux).
  - Open `/`, switch to **Projector Display**, press `F11` (Fullscreen), click **"Toggle Full Stage"**.
  - Test audio: Verify reel tick sound, 3-2-1 countdown voice, and victory fanfare play loudly through the gym speakers.
- [ ] **6:45 AM — Gate Attendance Desks:**
  - Position laptops at Gates 1, 2, 3, and 4.
  - Open `/attendance`, select Gate Station, enter Marshal Name, enter PIN `2026`.
  - Plug in USB barcode scanner guns and scan a test paper badge.
- [ ] **7:00 AM — Claims Desk & Printer:**
  - Open `/claims` on claims laptop, enter PIN `2026`.
  - Test-print 1 test slip to confirm printer alignment and paper feed.
- [ ] **7:15 AM — End-to-End Rehearsal (Dry Run):**
  - Gate marshal scans 3 sample teacher badges (marks them present).
  - Stage operator executes 1 test draw for a Grand Prize (watch reel spin, countdown, fanfare & confetti).
  - Stage operator clicks "Confirm Winners".
  - Claims desk locates the test winner and prints a test claim slip.
- [ ] **🚨 7:35 AM SHARP — THE 1-CLICK DRY RUN RESET (CRITICAL STEP):**
  - Go to `Admin ➔ Settings ➔ EVENT BACKUP & DRY RUN RECOVERY`.
  - Click the red button:  
    👉 **"Reset Friday Dry Run (Keep Pre-Draw Winners Intact)"**.
  - Enter Admin PIN `2026`.
  - **Verify in 2 seconds:**
    - [ ] Gate attendance count resets to **0**.
    - [ ] Test Grand Prize winner is wiped and stock is restored.
    - [ ] **ALL 50 THURSDAY PRE-DRAW WINNERS REMAIN 100% LOCKED & SAFE!**
    - [ ] All tablets and laptops refresh cleanly.

---

## 6. Friday 7:30 AM – 9:30 AM: Gate Influx Operations Checklist

- [ ] **Marshals at Entrances:**
  - Greet arriving teachers with a smile.
  - Scan attendee badge QR code using barcode gun or webcam.
- [ ] **Listen for Signals:**
  - 🟢 **Pleasant Double-Chime + Green Box:** Valid check-in! Teacher is now active in the raffle pool.
  - 🟠 **Warning Buzz + Amber Box:** Duplicate entry alert! Politely inform teacher they are already checked in.
- [ ] **Teacher Forgot Badge:**
  - Click the **Manual** tab.
  - Search teacher's **Surname** or **DepEd ID**.
  - Click **"Check In (Mark Present)"**.
- [ ] **Unlisted / Walk-In Teacher:**
  - Escort or direct teacher to the **Master Admin Secretariat Desk**.
  - Secretariat verifies credentials, clicks **➕ Add Walk-in Teacher** in Admin, selects "Eligible (Checked In)", and clicks Save.

---

## 7. Friday Program: Live Stage Raffle Checklist

- [ ] **Coordination:**
  - Projector operator sits with direct sightline or intercom to the Stage Emcee.
- [ ] **Raffle Execution Sequence:**
  1. Select the prize to draw from the dropdown.
  2. Select distribution mode (*Combined Pool* or *Equal Per District*).
  3. Set number of winners.
  4. Emcee leads audience countdown: *"3... 2... 1... SPIN!"*
  5. Operator clicks **"Start Live Draw"**.
  6. Reel spins, ticks sound, countdown triggers, fanfare blasts, and confetti explodes on the LED wall!
- [ ] **Two-Stage Review (Safety Net):**
  - Emcee calls the name.
  - Committee Chair verifies teacher presence/qualification.
  - **If Present & Qualified:** Click **🟢 "Confirm Winners"** (officially saved and pushed to Claims).
  - **If Absent / Disqualified:** Click **🔄 "Redraw Round"** (instantly discarded without penalty or lost prize counts).

---

## 8. Friday Continuous: Prize Claims & Print Queue Checklist

- [ ] **Winner Verification:**
  - Winning teacher presents Winner Verification Stub or DepEd ID / PRC License.
  - Claims officer scans QR code or searches surname in `/claims`.
- [ ] **ID Inspection:**
  - Inspect government/DepEd ID.
  - Enter ID number in the **ID Presented** box on screen.
- [ ] **Confirm Disbursement:**
  - Click **"Verify & Confirm Disbursement"**.
  - Click **"Print Claim Slip Receipt"** (2-part receipt).
- [ ] **Paper Signatures:**
  - Hand Part 1 to the winning teacher.
  - Have teacher sign Part 2 and file it into the **Official Audit Binder**.
  - Release physical item or cash envelope!
- [ ] **Special Cases:**
  - **Proxy Claim:** Toggle "Proxy Claim", input Proxy Name, Relationship, and authorization notes.
  - **Prize Forfeiture:** Click "Mark as Forfeited", enter reason $\rightarrow$ Prize immediately returns $+1$ unit back to stock for a stage redraw!
- [ ] **Print Queue Marshals:**
  - Check `/admin ➔ Print Queue`.
  - Print batch sheets and winner verification stubs as draws conclude.
  - Click **"Mark as Printed"**.

---

## 9. Friday 4:30 PM: Post-Event Wrap-Up & Audit Checklist

- [ ] **Generate Executive Audit Report:**
  - Open `Admin ➔ Reports`.
  - Click **"🖨️ Print Official Report"**.
- [ ] **Formal Audit Signatures:**
  - [ ] **Prepared By:** Signature of Raffle Committee Secretariat.
  - [ ] **Certified Correct:** Signature of Raffle Committee Chairperson.
  - [ ] **Attested & Observed:** Signature of DepEd PSDS & Municipal LGU / COA Representative.
- [ ] **Reconciliation:**
  - Total prizes claimed + total unclaimed/forfeited = Total sponsored inventory.
  - Ensure all Part 2 signed claim receipts are compiled in the binder.
- [ ] **Final Archive Backup:**
  - In `Admin ➔ Settings`, click **"Download Backup (.json)"**.
  - Save file to municipal archive flash drive.
- [ ] **Pack Up Hardware:**
  - Safely shut down all laptops and pack barcode scanner guns, cables, and power strips.

---

## 10. The Emergency "Go-Bag" (Disaster Recovery Kit)

Keep this small pouch or bag at the Master Admin Desk at all times:
- [ ] **2x USB Flash Drives** containing:
  - Thursday Pre-Draw Tier 1 `.json` backup file.
  - Offline copy of the raffle web application.
  - Masterlist Excel/CSV file.
- [ ] **1x Spare Heavy-Duty 3-Prong Extension Cord.**
- [ ] **1x Spare USB Barcode Scanner Gun.**
- [ ] **1x Spare 2m HDMI Cable.**
- [ ] **1x Spare 3.5mm Aux Audio Cable.**
- [ ] **1x Fully Charged 20,000mAh Power Bank** (for phones/pocket Wi-Fi).
- [ ] **Printout of the System Manual & Security PINs (`2026`).**

---

*Official Document of the Municipal Teachers' Day Organizing Committee*  
*Municipality of Malungon, Province of Sarangani — Celebrating Our Dedicated Educators!*
