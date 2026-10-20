# 🎬 Real-Life Scenario Guide: 3-Tier Pre-Draw & Dry Run Recovery System
**Municipal Teachers' Day 2026 Raffle System — Malungon, Sarangani Province**

---

## 🎯 The Core Problem Solved
- **Thursday:** You conduct the **Real Official Pre-Draw** (e.g., 50 minor appliance winners).
- **Friday Morning (6:30 AM):** The stage crew, sound technicians, and gate marshals need to conduct a **Dry Run / Rehearsal** (test gate scanners, spin live stage wheel, test LED projector, audio fanfare, claims desk).
- **The Fear:** If you test live stage draws and scan badges on Friday morning, you risk mixing fake test winners with real Thursday winners, reducing prize stocks, or accidentally wiping Thursday's results!

Here is how the **3-Tier Backup & Recovery System** protects your event with zero stress.

---

## 🧰 Meet the 3 Tiers (Simple Analogy)

| Tier | Tool Name | Simple Analogy | Best Time to Use It |
|---|---|---|---|
| **Tier 1** | **Download Backup File (`.json`)** | 🪂 **The Emergency Parachute** | Right after Thursday Pre-Draw finishes. Save to a USB flash drive or Google Drive. |
| **Tier 2** | **Save Browser Snapshot** | 📑 **The Quick Bookmark** | Right after clicking *"Prepare Roster for Gate"* on Thursday afternoon. |
| **Tier 3** | **Reset Friday Dry Run** | 🧹 **The Magic Rehearsal Eraser** | Friday at 7:30 AM, immediately after rehearsal finishes and before real gates open. |

---

## 📅 Step-by-Step Real Event Scenario

### 🕒 SCENARIO 1: Thursday Afternoon (Official Pre-Draw Day)
**Time:** Thursday, 2:00 PM – 4:00 PM  
**Location:** Secretariat Office / Committee Room

1. **Import Masterlist:**
   - Go to **Admin ➔ Participants Manager ➔ Import Sheet**.
   - Choose: **"INSTANTLY ELIGIBLE"**.
   - *Why?* Because teachers have not physically arrived at the gate yet. This puts all ~1,200 teachers into the Pre-Draw wheel.
2. **Conduct the Pre-Draw Rounds:**
   - Go to **Pre-Draw Station**.
   - Select minor prizes (e.g., Rice Cookers, Electric Fans, Grocery Packs).
   - Draw winners in batches (5, 10, or 20 at a time).
   - Click **Confirm Batch** after each draw.
   - *Result:* 50 teachers are now officially marked as `WINNER = YES`.
3. **Lock Pre-Draw Winners & Prepare for Friday Gate Scanners:**
   - In the purple banner at the top of Pre-Draw Station, click:  
     👉 **"Prepare Roster for Gate"** (`Reset Non-winners for Gate`).
   - *What happens:*
     - The **50 Pre-Draw winners stay locked** (`WINNER = YES`). They can never win again on the Live Stage.
     - The remaining **1,150 non-winners become `INELIGIBLE`**. They must physically scan their QR badge at the gym entrance tomorrow morning to qualify for the Grand Prizes!
4. **SECURE YOUR THURSDAY WORK (Crucial Step):**
   - Click **"Save Snapshot"** *(Tier 2: Locks this exact state in the browser)*.
   - Click **"Download Backup"** *(Tier 1: Downloads `TeachersDay2026_Backup_[timestamp].json`)*.
   - 💡 *Copy this file to a USB flash drive and your Google Drive.*

---

### 🕒 SCENARIO 2: Friday Morning (Rehearsal & Dry Run)
**Time:** Friday, 6:30 AM – 7:30 AM  
**Location:** Malungon Gymnasium (Main Stage, Gate 1–4, LED Wall)

Now the production team wants to test everything before the gym doors open to real teachers:

1. **Test Gate Check-in:**
   - A gate marshal opens `/attendance` on a tablet and scans 3 sample teacher badges.
   - *Result:* Screen beeps, turns green, and marks them present.
2. **Test LED Wall & Audio:**
   - Open `/` on the laptop connected to the gym LED wall and sound system.
   - Select a Grand Prize (e.g., 55" Smart TV).
   - Click **Commence Draw ➔ Start Live Draw**.
   - Verify mechanical name spinning reel, dramatic 3-2-1 audio countdown, and confetti explosion on the LED wall!
3. **Test Claims Desk & Print Queue:**
   - Click **Confirm Winners** on the test draw.
   - Open `/claims` and verify the test claim slip appears and prints cleanly.
4. **The Situation at 7:30 AM:**
   - Your system now has 3 fake gate scans and 1 fake Smart TV test winner recorded.
   - **DO NOT PANIC!** The real event hasn't started yet.

---

### 🕒 SCENARIO 3: Post-Rehearsal Reset (The 1-Click Magic)
**Time:** Friday, 7:35 AM (25 minutes before doors open at 8:00 AM)  
**Location:** Admin Control Desk

You have two super easy choices to clear the rehearsal data:

#### 👉 Option A (Recommended): Use Tier 3 — "Reset Friday Dry Run"
1. Go to **Admin ➔ Settings ➔ EVENT BACKUP & DRY RUN RECOVERY**.
2. Click the red button:  
   👉 **"Reset Friday Dry Run (Keep Pre-Draw Winners Intact)"**.
3. *What happens in 1 second:*
   - 🧹 Removes the 1 fake Smart TV test winner from rehearsal.
   - 🔄 Restores the Smart TV stock back to available.
   - 🧼 Wipes the 3 test gate scans (gate attendance count resets to 0).
   - 🔒 **KEEPS ALL 50 THURSDAY PRE-DRAW WINNERS 100% UNTOUCHED & LOCKED!**
   - ☁️ Automatically syncs to Supabase Cloud so all gate tablets, LED walls, and claims laptops are instantly reset.

#### 👉 Option B: Use Tier 2 — "Restore Official Snapshot"
1. In the same Settings section, click:  
   👉 **"Restore Official Snapshot"**.
2. Enter your Admin PIN (`2026`).
3. *What happens:*
   - Instantly rolls back the entire database to the exact moment you took Thursday's snapshot!

---

### 🚨 SCENARIO 4: The "Worst-Case" Emergency (Disaster Recovery)
**Situation:** Someone spilled coffee on the main laptop, or someone clicked the wrong button and closed the browser.

1. Take your spare laptop.
2. Plug in your USB flash drive with the **Tier 1 Backup File** (`TeachersDay2026_Backup_...json`).
3. Open the raffle website: `https://teachers-day-raffle-system.web.app/admin`.
4. Go to **Settings ➔ Event Backup & Dry Run Recovery**.
5. Under **"4. Restore from Backup File"**, click **Upload Backup File** and select your `.json` file from the USB.
6. Click **Confirm & Restore File**.
7. *Result:* Within 5 seconds, the entire system—all participants, all Thursday Pre-Draw winners, all prize counts, and Supabase Cloud—is 100% restored as if nothing happened!

---

## 📋 Quick Cheat Sheet for Secretariat

```
Thursday 4:00 PM:
  [Pre-Draw Done] ──► [Prepare Roster for Gate] ──► [Save Snapshot] ──► [Download .json Backup]

Friday 7:30 AM (After Dry Run):
  [Settings] ──► Click: [Reset Friday Dry Run (Keep Pre-Draw Winners Intact)] ──► DONE!
```
