# Municipal Teachers’ Day 2026 Raffle System
**Municipality of Malungon, Sarangani Province**  
*Technology Stack: Google Apps Script + Google Sheets + HTML5 / CSS3 / JavaScript*

---

## 🌟 Overview & Key Concepts

This raffle system was purpose-built for the **Municipal Teachers' Day 2026 Celebration in Malungon**, handling **2,000+ teaching and non-teaching personnel** across five districts:
1. **NORTH**
2. **SOUTH**
3. **EAST**
4. **WEST**
5. **PRIVATE**

### Core Architectural Mandates:
1. **Five Visual District Cards (2-2-1 Arrangement)**: Always displayed simultaneously on the projector / LED screen.
2. **Centralized Random Selection**: Selection occurs from **ONE combined pool** of all eligible participants across all five districts. The cards are visual representations, not five separate draws.
3. **Prize Quantity = Total Winners**: If the prize is ₱500 Cash with Quantity 3, the system selects exactly **3 winners** from the combined pool (never 3 × 5 = 15).
4. **Natural Fair Distribution**: Unbiased Fisher-Yates shuffle. Any district can have 0, 1, 2, or all winners depending purely on fair random chance.
5. **Event-Day Safety (Two-Stage Confirmation)**:
   - Drawing animates on screen with rapid name cycling and 3-2-1 countdown.
   - Results are presented for review.
   - **Only when the administrator clicks "CONFIRM WINNERS"** are the winners officially recorded, participants marked `Winner = YES`, prize quantities decremented, and the audit log recorded.
   - If something went wrong, the administrator can safely **REDRAW** without altering database state.

---

## 📋 Google Sheets Database Structure

Create a Google Spreadsheet with these **5 Sheets**:

### 1. `PARTICIPANTS`
| Column | Header Name | Description | Example |
|---|---|---|---|
| A | `Participant ID` | Unique ID | `TD26-00001` |
| B | `Last Name` | Surname | `Santos` |
| C | `First Name` | Given Name | `Maria` |
| D | `Middle Name` | Middle Initial / Name | `G.` |
| E | `Full Name` | Complete display name | `Santos, Maria G.` |
| F | `District` | Must be `NORTH`, `SOUTH`, `EAST`, `WEST`, `PRIVATE` | `NORTH` |
| G | `Personnel Type` | `TEACHING` or `NON-TEACHING` | `TEACHING` |
| H | `School` | School Name | `Malungon National High School` |
| I | `Position` | Academic or admin rank | `Teacher III` |
| J | `Contact Number` | Mobile number | `09171234567` |
| K | `Eligible` | `ELIGIBLE` or `INELIGIBLE` | `ELIGIBLE` |
| L | `Winner` | `YES` or `NO` | `NO` |
| M | `Claimed` | `YES` or `NO` | `NO` |
| N | `Status` | Record status | `ACTIVE` |
| O | `Created At` | Timestamp | `2026-09-01 08:00:00` |

### 2. `PRIZES`
| Column | Header Name | Example |
|---|---|---|
| A | `Prize ID` | `P001` |
| B | `Prize Name` | `₱500 Cash Prize` |
| C | `Prize Description` | `Cash incentive envelope for Teachers Day 2026` |
| D | `Unit Value` | `500` |
| E | `Quantity` | `10` |
| F | `Drawn Quantity` | `0` |
| G | `Remaining Quantity` | `10` |
| H | `Total Value` | `5000` |
| I | `Status` | `AVAILABLE` or `EXHAUSTED` |

### 3. `WINNERS`
| Column | Header Name | Example |
|---|---|---|
| A | `Winner ID` | `WN-0001` |
| B | `Participant ID` | `TD26-00342` |
| C | `Name` | `Santos, Maria G.` |
| D | `District` | `NORTH` |
| E | `Personnel Type` | `TEACHING` |
| F | `School` | `Malungon Central Elementary School` |
| G | `Prize` | `₱500 Cash Prize` |
| H | `Draw Number` | `DRAW-0001` |
| I | `Date` | `2026-10-05` |
| J | `Time` | `10:15:30` |
| K | `Claim Status` | `UNCLAIMED` or `CLAIMED` |
| L | `Claimed At` | `2026-10-05 11:00:00` |
| M | `Claimed By` | `Claims Committee Officer` |

### 4. `RAFFLE_LOG`
| Column | Header Name | Description |
|---|---|---|
| A | `Log ID` | `LOG-0001` |
| B | `Draw Number` | `DRAW-0001` |
| C | `Timestamp` | `2026-10-05 10:15:30` |
| D | `Prize ID` | `P001` |
| E | `Prize Name` | `₱500 Cash Prize` |
| F | `Number of Winners` | `3` |
| G | `Eligible Pool Size` | `1950` |
| H | `Winner IDs` | `TD26-00124, TD26-00892, TD26-01502` |
| I | `Status` | `CONFIRMED`, `REDRAWN`, or `CANCELLED` |
| J | `Admin` | Admin Google Account email |

### 5. `SETTINGS`
| Column A (`Setting Key`) | Column B (`Setting Value`) |
|---|---|
| `Event Name` | `Municipal Teachers' Day 2026` |
| `Event Date` | `October 5, 2026` |
| `Location` | `Malungon Gymnasium, Malungon, Sarangani` |
| `Organization` | `Municipality of Malungon & DepEd Malungon Districts` |
| `Allow Multiple Wins` | `FALSE` |
| `Default Animation Duration` | `6` |
| `Raffle Status` | `READY` |

---

## 🚀 Quick Setup Instructions (5 Minutes)

1. **Open Google Sheets**: Create a blank sheet at [sheets.new](https://sheets.new).
2. **Open Apps Script**: In the top menu, go to **Extensions > Apps Script**.
3. **Copy Code**:
   - In the script editor, replace `Code.gs` with the content of `gas/Code.gs`.
   - Click the **+** button next to Files and add an **HTML** file named `Index`. Paste the content of `gas/Index.html`.
   - Add another Script file named `SetupSheets.gs` and paste the content of `gas/SetupSheets.gs`.
4. **Run One-Click Sheet Setup**:
   - In the toolbar dropdown at the top, select `runInitialSetup`.
   - Click **Run**.
   - When prompted, grant Google permissions.
   - All 5 sheets and headers are now automatically built with Malungon Teachers' Day Orange styling!
5. **Import Participants**:
   - Paste your 2,000 participants directly into the `PARTICIPANTS` sheet starting at Row 2.
6. **Deploy as Web App**:
   - Click the blue **Deploy** button > **New deployment**.
   - Select type: **Web app**.
   - Description: `Teachers Day 2026 Live Raffle`.
   - Execute as: **Me** (your Google account).
   - Who has access: **Anyone** (or "Anyone within organization").
   - Click **Deploy** and copy the Web App URL.

---

## 🖥️ Live Event Operation URLs

- **Public Projector / LED Screen**:
  `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=raffle`
- **Admin Control Dashboard**:
  `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=admin`

---

## 🎮 Conducting the Live Raffle

1. Open the **Admin URL** on the laptop controller.
2. Open the **Public Display URL** on the projector / LED wall and press **Fullscreen (F11)**.
3. Select the Prize from the dropdown (e.g., `₱500 Cash Prize`).
4. The system automatically computes `Winners to Draw = Prize Remaining Quantity`.
5. Click **🎲 START DRAW**:
   - All five district cards on the projector animate simultaneously with cycling names.
   - Countdown triggers: `3... 2... 1...`.
   - Winners are revealed on their respective district cards with festive confetti!
6. In the Admin Confirmation modal:
   - Verify the winners.
   - Click **✓ CONFIRM WINNERS** to finalize.
   - (Or click **🔄 REDRAW** if an invalid entry or absent person needs to be redrawn).
7. Ready for the next prize!
