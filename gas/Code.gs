/**
 * =========================================================================
 * MUNICIPAL TEACHERS' DAY 2026 RAFFLE SYSTEM
 * Municipality of Malungon, Sarangani Province
 * 
 * Google Apps Script Backend (Code.gs)
 * Compatible with Google Sheets + Google Apps Script Web App
 * =========================================================================
 */

// Sheet Names Configuration
const SHEETS = {
  PARTICIPANTS: 'PARTICIPANTS',
  PRIZES: 'PRIZES',
  WINNERS: 'WINNERS',
  RAFFLE_LOG: 'RAFFLE_LOG',
  SETTINGS: 'SETTINGS'
};

/**
 * Web App Entry Point
 * Handles page routing (?page=raffle, ?page=display, or ?page=admin)
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page.toLowerCase() : 'admin';
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialPage = (page === 'raffle' || page === 'display') ? 'raffle' : 'admin';
  
  return template.evaluate()
    .setTitle("Municipal Teachers' Day 2026 Raffle System - Malungon")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper to include partial HTML files if needed
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get active spreadsheet with safety checks
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Read system settings from SETTINGS sheet
 */
function getSettings() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.SETTINGS);
    if (!sheet) {
      return getDefaultSettings();
    }
    const data = sheet.getDataRange().getValues();
    const settings = getDefaultSettings();
    
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0]).trim();
      const val = data[i][1];
      if (key === 'Event Name') settings.eventName = String(val);
      else if (key === 'Event Date') settings.eventDate = String(val);
      else if (key === 'Location') settings.location = String(val);
      else if (key === 'Organization') settings.organization = String(val);
      else if (key === 'Allow Multiple Wins') settings.allowMultipleWins = (val === true || String(val).toUpperCase() === 'TRUE');
      else if (key === 'Default Animation Duration') settings.animationDuration = Number(val) || 6;
      else if (key === 'Raffle Status') settings.raffleStatus = String(val);
    }
    return settings;
  } catch (err) {
    Logger.log('Error reading settings: ' + err.message);
    return getDefaultSettings();
  }
}

function getDefaultSettings() {
  return {
    eventName: "Municipal Teachers' Day 2026",
    eventDate: 'October 5, 2026',
    location: 'Malungon Gymnasium, Malungon',
    organization: 'Municipality of Malungon & DepEd Malungon Districts',
    allowMultipleWins: false,
    animationDuration: 6,
    soundEnabled: true,
    raffleStatus: 'READY'
  };
}

/**
 * Save settings to SETTINGS sheet
 */
function saveSettings(settings) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.SETTINGS);
  }
  
  const rows = [
    ['Setting Key', 'Setting Value'],
    ['Event Name', settings.eventName || "Municipal Teachers' Day 2026"],
    ['Event Date', settings.eventDate || 'October 5, 2026'],
    ['Location', settings.location || 'Malungon Gymnasium, Malungon'],
    ['Organization', settings.organization || 'Municipality of Malungon & DepEd Malungon Districts'],
    ['Allow Multiple Wins', settings.allowMultipleWins ? 'TRUE' : 'FALSE'],
    ['Default Animation Duration', settings.animationDuration || 6],
    ['Raffle Status', settings.raffleStatus || 'READY']
  ];
  
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  return { success: true };
}

/**
 * Get all prizes with calculated fields
 */
function getPrizes() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PRIZES);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const prizes = [];
  // Headers: Prize ID, Prize Name, Prize Description, Unit Value, Quantity, Drawn Quantity, Remaining Quantity, Total Value, Status
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    const unitVal = Number(row[3]) || 0;
    const qty = Number(row[4]) || 0;
    const drawn = Number(row[5]) || 0;
    const remaining = Math.max(0, qty - drawn);
    const totalVal = unitVal * qty;
    const status = remaining > 0 ? 'AVAILABLE' : 'EXHAUSTED';
    
    prizes.push({
      id: String(row[0]),
      name: String(row[1]),
      description: String(row[2] || ''),
      unitValue: unitVal,
      quantity: qty,
      drawnQuantity: drawn,
      remainingQuantity: remaining,
      totalValue: totalVal,
      status: status
    });
  }
  return prizes;
}

/**
 * Get all participants (batch read)
 */
function getParticipants() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const participants = [];
  // Headers: Participant ID, Last Name, First Name, Middle Name, Full Name, District, Personnel Type, School, Position, Contact Number, Eligible, Winner, Claimed, Status, Created At
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[0]) continue;
    
    participants.push({
      id: String(r[0]),
      lastName: String(r[1]),
      firstName: String(r[2]),
      middleName: String(r[3] || ''),
      fullName: String(r[4] || (r[1] + ', ' + r[2])),
      district: String(r[5]).toUpperCase().trim(),
      personnelType: String(r[6]).toUpperCase().trim(),
      school: String(r[7] || ''),
      position: String(r[8] || ''),
      contactNumber: String(r[9] || ''),
      eligible: String(r[10]).toUpperCase().trim(),
      winner: String(r[11]).toUpperCase().trim(),
      claimed: String(r[12] || 'NO').toUpperCase().trim(),
      status: String(r[13] || 'ACTIVE'),
      createdAt: String(r[14] || '')
    });
  }
  return participants;
}

/**
 * Dashboard stats: fast calculation from memory
 */
function getDashboardStats() {
  const participants = getParticipants();
  const prizes = getPrizes();
  
  let eligibleCount = 0;
  let winnerCount = 0;
  const districtCounts = { NORTH: 0, SOUTH: 0, EAST: 0, WEST: 0, PRIVATE: 0 };
  const personnelCounts = { TEACHING: 0, 'NON-TEACHING': 0 };
  
  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (p.eligible === 'ELIGIBLE') eligibleCount++;
    if (p.winner === 'YES') winnerCount++;
    
    if (districtCounts[p.district] !== undefined) {
      districtCounts[p.district]++;
    }
    if (personnelCounts[p.personnelType] !== undefined) {
      personnelCounts[p.personnelType]++;
    }
  }
  
  let remainingPrizes = 0;
  let totalPrizeValue = 0;
  for (let j = 0; j < prizes.length; j++) {
    remainingPrizes += prizes[j].remainingQuantity;
    totalPrizeValue += prizes[j].totalValue;
  }
  
  return {
    totalParticipants: participants.length,
    eligibleCount: eligibleCount,
    winnerCount: winnerCount,
    remainingPrizes: remainingPrizes,
    totalPrizeValue: totalPrizeValue,
    districtCounts: districtCounts,
    personnelCounts: personnelCounts
  };
}

/**
 * Fisher-Yates unbiased shuffle algorithm
 */
function fisherYatesShuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * RAFFLE ENGINE: Draw Winners
 * 
 * 1. Loads all participants in ONE batch read.
 * 2. Filters Eligible = ELIGIBLE.
 * 3. Filters Winner = NO (when multiple wins are disabled).
 * 4. Combines participants from all 5 districts into ONE pool.
 * 5. Fairly shuffles using Fisher-Yates.
 * 6. Selects N unique winners (N = prize remaining quantity).
 * 7. Generates temporary draw result.
 * 8. DOES NOT WRITE TO SHEETS YET (awaits admin confirmation).
 */
function drawWinners(prizeId) {
  const prizes = getPrizes();
  const prize = prizes.find(p => p.id === prizeId);
  
  if (!prize) {
    throw new Error('Selected prize not found.');
  }
  
  if (prize.remainingQuantity <= 0) {
    throw new Error('This prize has already been completely drawn.');
  }
  
  const settings = getSettings();
  const participants = getParticipants();
  
  // Build combined pool of all eligible participants across all districts (excluding Non-Teaching)
  const eligiblePool = participants.filter(p => {
    if (p.eligible !== 'ELIGIBLE') return false;
    if (!settings.allowMultipleWins && p.winner === 'YES') return false;
    if (p.personnelType === 'NON-TEACHING' || (p.typeOfPersonnel && p.typeOfPersonnel.toLowerCase().includes('non'))) return false;
    return true;
  });
  
  const requiredWinners = prize.remainingQuantity;
  
  if (eligiblePool.length < requiredWinners) {
    throw new Error(
      'Insufficient eligible participants. Needed: ' + requiredWinners + ', Available: ' + eligiblePool.length
    );
  }
  
  // Fair shuffle across the combined pool
  const shuffledPool = fisherYatesShuffle(eligiblePool);
  
  // Pick N unique winners
  const selectedWinners = shuffledPool.slice(0, requiredWinners);
  
  // Generate next draw number (e.g. DRAW-0001)
  const drawNumber = getNextDrawNumber();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
  
  return {
    drawNumber: drawNumber,
    prize: prize,
    winners: selectedWinners,
    timestamp: timestamp,
    eligiblePoolSize: eligiblePool.length
  };
}

/**
 * Determine next sequential Draw Number from RAFFLE_LOG sheet
 */
function getNextDrawNumber() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.RAFFLE_LOG);
  if (!sheet) return 'DRAW-0001';
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 'DRAW-0001';
  
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const drawStr = String(data[i][1] || ''); // Col 2 is Draw Number
    const match = drawStr.match(/DRAW-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  
  const nextNum = maxNum + 1;
  return 'DRAW-' + ('0000' + nextNum).slice(-4);
}

/**
 * ADMIN CONFIRMATION: Persist Winners to Sheets
 * 
 * Only after the administrator clicks "CONFIRM WINNERS":
 * 1. Batch writes new records to WINNERS sheet.
 * 2. Updates Participant Winner column to 'YES' in PARTICIPANTS sheet.
 * 3. Updates Drawn Quantity in PRIZES sheet.
 * 4. Logs to RAFFLE_LOG sheet with status CONFIRMED.
 */
function confirmDraw(drawResult) {
  if (!drawResult || !drawResult.winners || !drawResult.prize) {
    throw new Error('Invalid draw result provided for confirmation.');
  }
  
  const ss = getSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); // Thread safety for simultaneous requests
  
  try {
    const winnersSheet = ss.getSheetByName(SHEETS.WINNERS);
    const participantsSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
    const prizesSheet = ss.getSheetByName(SHEETS.PRIZES);
    const logSheet = ss.getSheetByName(SHEETS.RAFFLE_LOG);
    
    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'Asia/Manila', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, 'Asia/Manila', 'HH:mm:ss');
    const fullTimestamp = dateStr + ' ' + timeStr;
    
    // 1. Prepare WINNERS rows
    // Headers: Winner ID, Participant ID, Name, District, Personnel Type, School, Prize, Draw Number, Date, Time, Claim Status, Claimed At, Claimed By
    const existingWinnersCount = Math.max(0, winnersSheet.getLastRow() - 1);
    const newWinnerRows = [];
    const winnerIds = [];
    const winnerNames = [];
    
    drawResult.winners.forEach((w, idx) => {
      const winnerId = 'WN-' + ('0000' + (existingWinnersCount + idx + 1)).slice(-4);
      winnerIds.push(w.id);
      winnerNames.push(w.fullName);
      
      newWinnerRows.push([
        winnerId,
        w.id,
        w.fullName,
        w.district,
        w.personnelType,
        w.school,
        drawResult.prize.name,
        drawResult.drawNumber,
        dateStr,
        timeStr,
        'UNCLAIMED',
        '',
        ''
      ]);
    });
    
    if (newWinnerRows.length > 0) {
      winnersSheet.getRange(winnersSheet.getLastRow() + 1, 1, newWinnerRows.length, 13).setValues(newWinnerRows);
    }
    
    // 2. Batch update PARTICIPANTS sheet: set Winner = 'YES'
    const pData = participantsSheet.getDataRange().getValues();
    const winnerIdSet = new Set(winnerIds);
    let updatedCount = 0;
    
    for (let r = 1; r < pData.length; r++) {
      const pId = String(pData[r][0]);
      if (winnerIdSet.has(pId)) {
        pData[r][11] = 'YES'; // Column L (index 11) is Winner
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      participantsSheet.getDataRange().setValues(pData);
    }
    
    // 3. Update PRIZES sheet: increase Drawn Quantity
    const prizeData = prizesSheet.getDataRange().getValues();
    for (let p = 1; p < prizeData.length; p++) {
      if (String(prizeData[p][0]) === drawResult.prize.id) {
        const currentDrawn = Number(prizeData[p][5]) || 0;
        const newDrawn = currentDrawn + drawResult.winners.length;
        const totalQty = Number(prizeData[p][4]) || 0;
        const remaining = Math.max(0, totalQty - newDrawn);
        
        prizeData[p][5] = newDrawn; // Drawn Quantity
        prizeData[p][6] = remaining; // Remaining Quantity
        prizeData[p][8] = remaining <= 0 ? 'EXHAUSTED' : 'AVAILABLE'; // Status
        break;
      }
    }
    prizesSheet.getDataRange().setValues(prizeData);
    
    // 4. Log to RAFFLE_LOG sheet
    // Headers: Log ID, Draw Number, Timestamp, Prize ID, Prize Name, Number of Winners, Eligible Pool Size, Winner IDs, Status, Admin
    const logId = 'LOG-' + ('0000' + Math.max(1, logSheet.getLastRow())).slice(-4);
    const logRow = [
      logId,
      drawResult.drawNumber,
      fullTimestamp,
      drawResult.prize.id,
      drawResult.prize.name,
      drawResult.winners.length,
      drawResult.eligiblePoolSize,
      winnerIds.join(', '),
      'CONFIRMED',
      Session.getActiveUser().getEmail() || 'Event Administrator'
    ];
    logSheet.appendRow(logRow);
    
    return {
      success: true,
      drawNumber: drawResult.drawNumber,
      winnersRecorded: newWinnerRows.length
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * REDRAW / CANCEL DRAW
 * Logs cancellation to audit trail without touching participant or prize state
 */
function cancelDraw(drawResult, reason) {
  try {
    const ss = getSpreadsheet();
    const logSheet = ss.getSheetByName(SHEETS.RAFFLE_LOG);
    if (!logSheet) return { success: true };
    
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
    const logId = 'LOG-' + ('0000' + Math.max(1, logSheet.getLastRow())).slice(-4);
    
    logSheet.appendRow([
      logId,
      drawResult.drawNumber,
      timestamp,
      drawResult.prize.id,
      drawResult.prize.name,
      drawResult.winners.length,
      drawResult.eligiblePoolSize,
      'DISCARDED',
      reason === 'REDRAW' ? 'REDRAWN' : 'CANCELLED',
      Session.getActiveUser().getEmail() || 'Event Administrator'
    ]);
    return { success: true };
  } catch (e) {
    Logger.log('Error logging cancellation: ' + e.message);
    return { success: true };
  }
}

/**
 * Get Winner History
 */
function getWinners() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.WINNERS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const winners = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[0]) continue;
    
    winners.push({
      winnerId: String(r[0]),
      participantId: String(r[1]),
      name: String(r[2]),
      district: String(r[3]),
      personnelType: String(r[4]),
      school: String(r[5]),
      prize: String(r[6]),
      drawNumber: String(r[7]),
      date: String(r[8]),
      time: String(r[9]),
      claimStatus: String(r[10] || 'UNCLAIMED'),
      claimedAt: String(r[11] || ''),
      claimedBy: String(r[12] || '')
    });
  }
  return winners;
}

/**
 * Mark Prize as Claimed
 */
function markPrizeClaimed(winnerId, claimedBy) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.WINNERS);
  const participantsSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
  if (!sheet) throw new Error('WINNERS sheet not found');
  
  const data = sheet.getDataRange().getValues();
  let found = false;
  let participantId = '';
  const now = Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === winnerId) {
      data[i][10] = 'CLAIMED';
      data[i][11] = now;
      data[i][12] = claimedBy || Session.getActiveUser().getEmail() || 'Claims Officer';
      participantId = String(data[i][1]);
      found = true;
      break;
    }
  }
  
  if (!found) throw new Error('Winner record not found: ' + winnerId);
  sheet.getDataRange().setValues(data);
  
  // Also update Claimed column in PARTICIPANTS sheet
  if (participantId && participantsSheet) {
    const pData = participantsSheet.getDataRange().getValues();
    for (let j = 1; j < pData.length; j++) {
      if (String(pData[j][0]) === participantId) {
        pData[j][12] = 'YES'; // Claimed column
        break;
      }
    }
    participantsSheet.getDataRange().setValues(pData);
  }
  
  return { success: true, claimedAt: now };
}

/**
 * INITIAL SETUP SCRIPT
 * Run this function ONCE inside Google Apps Script to automatically build
 * all five sheets with professional headers, formatting, formulas, and initial sample data!
 */
function setupInitialSheets() {
  const ss = getSpreadsheet();
  
  // 1. Setup SETTINGS sheet
  let settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!settingsSheet) settingsSheet = ss.insertSheet(SHEETS.SETTINGS);
  settingsSheet.clear();
  const settingsRows = [
    ['Setting Key', 'Setting Value'],
    ['Event Name', "Municipal Teachers' Day 2026"],
    ['Event Date', 'October 5, 2026'],
    ['Location', 'Malungon Gymnasium, Malungon, Sarangani'],
    ['Organization', 'Municipality of Malungon & DepEd Malungon Districts'],
    ['Allow Multiple Wins', 'FALSE'],
    ['Default Animation Duration', '6'],
    ['Raffle Status', 'READY']
  ];
  settingsSheet.getRange(1, 1, settingsRows.length, 2).setValues(settingsRows);
  formatHeaderRow(settingsSheet, 2);
  
  // 2. Setup PRIZES sheet
  let prizesSheet = ss.getSheetByName(SHEETS.PRIZES);
  if (!prizesSheet) prizesSheet = ss.insertSheet(SHEETS.PRIZES);
  prizesSheet.clear();
  const prizeHeaders = [
    ['Prize ID', 'Prize Name', 'Prize Description', 'Unit Value', 'Quantity', 'Drawn Quantity', 'Remaining Quantity', 'Total Value', 'Status']
  ];
  const samplePrizes = [
    ['P001', '₱500 Cash Prize', 'Cash incentive envelope for Teachers Day 2026', 500, 10, 0, 10, 5000, 'AVAILABLE'],
    ['P002', '₱1,000 Cash Prize', 'Special cash grant envelope for educators', 1000, 6, 0, 6, 6000, 'AVAILABLE'],
    ['P003', 'Standard Stand Fan', '16-inch high-velocity oscillating electric stand fan', 1500, 5, 0, 5, 7500, 'AVAILABLE'],
    ['P004', 'Digital Rice Cooker (1.8L)', 'Multi-function non-stick electric rice cooker', 1800, 4, 0, 4, 7200, 'AVAILABLE'],
    ['P005', '₱2,000 Cash Prize', 'Executive cash prize for municipal educators', 2000, 3, 0, 3, 6000, 'AVAILABLE'],
    ['P006', 'Microwave Oven (20L)', 'Stainless digital countertop microwave oven', 3600, 2, 0, 2, 7200, 'AVAILABLE'],
    ['P007', '₱5,000 Grand Cash Prize', 'Grand cash bonanza for Malungon educators', 5000, 2, 0, 2, 10000, 'AVAILABLE'],
    ['P008', '43" Smart Full HD LED TV', 'Smart LED TV with Google TV & Dolby Audio', 14500, 1, 0, 1, 14500, 'AVAILABLE'],
    ['P009', 'Washing Machine (7.5kg)', 'Top-load energy-saving inverter washing machine', 13800, 1, 0, 1, 13800, 'AVAILABLE'],
    ['P010', 'Educator Laptop (Core i5)', 'Teacher digital workstation laptop', 28500, 1, 0, 1, 28500, 'AVAILABLE']
  ];
  prizesSheet.getRange(1, 1, 1, prizeHeaders[0].length).setValues(prizeHeaders);
  prizesSheet.getRange(2, 1, samplePrizes.length, samplePrizes[0].length).setValues(samplePrizes);
  formatHeaderRow(prizesSheet, prizeHeaders[0].length);
  
  // 3. Setup WINNERS sheet
  let winnersSheet = ss.getSheetByName(SHEETS.WINNERS);
  if (!winnersSheet) winnersSheet = ss.insertSheet(SHEETS.WINNERS);
  winnersSheet.clear();
  const winnerHeaders = [
    ['Winner ID', 'Participant ID', 'Name', 'District', 'Personnel Type', 'School', 'Prize', 'Draw Number', 'Date', 'Time', 'Claim Status', 'Claimed At', 'Claimed By']
  ];
  winnersSheet.getRange(1, 1, 1, winnerHeaders[0].length).setValues(winnerHeaders);
  formatHeaderRow(winnersSheet, winnerHeaders[0].length);
  
  // 4. Setup RAFFLE_LOG sheet
  let logSheet = ss.getSheetByName(SHEETS.RAFFLE_LOG);
  if (!logSheet) logSheet = ss.insertSheet(SHEETS.RAFFLE_LOG);
  logSheet.clear();
  const logHeaders = [
    ['Log ID', 'Draw Number', 'Timestamp', 'Prize ID', 'Prize Name', 'Number of Winners', 'Eligible Pool Size', 'Winner IDs', 'Status', 'Admin']
  ];
  logSheet.getRange(1, 1, 1, logHeaders[0].length).setValues(logHeaders);
  formatHeaderRow(logSheet, logHeaders[0].length);
  
  // 5. Setup PARTICIPANTS sheet headers
  let partSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
  if (!partSheet) partSheet = ss.insertSheet(SHEETS.PARTICIPANTS);
  if (partSheet.getLastRow() <= 1) {
    partSheet.clear();
    const partHeaders = [
      ['Participant ID', 'Last Name', 'First Name', 'Middle Name', 'Full Name', 'District', 'Personnel Type', 'School', 'Position', 'Contact Number', 'Eligible', 'Winner', 'Claimed', 'Status', 'Created At']
    ];
    partSheet.getRange(1, 1, 1, partHeaders[0].length).setValues(partHeaders);
    formatHeaderRow(partSheet, partHeaders[0].length);
  }
  
  SpreadsheetApp.flush();
  return 'All sheets successfully configured for Municipal Teachers Day 2026!';
}

/**
 * Formats header rows with vibrant Teachers Day Orange (#EA580C), bold white text and freeze
 */
function formatHeaderRow(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange.setBackground('#EA580C');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Arial');
  sheet.setFrozenRows(1);
  for (let c = 1; c <= numColumns; c++) {
    sheet.autoResizeColumn(c);
  }
}
