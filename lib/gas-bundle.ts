export const GAS_CODE_GS = `/**
 * =========================================================================
 * MUNICIPAL TEACHERS' DAY 2026 RAFFLE SYSTEM
 * Municipality of Malungon, Sarangani Province
 * 
 * Google Apps Script Backend (Code.gs)
 * Compatible with Google Sheets + Google Apps Script Web App
 * =========================================================================
 */

const SHEETS = {
  PARTICIPANTS: 'PARTICIPANTS',
  PRIZES: 'PRIZES',
  WINNERS: 'WINNERS',
  RAFFLE_LOG: 'RAFFLE_LOG',
  SETTINGS: 'SETTINGS'
};

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page.toLowerCase() : 'admin';
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialPage = (page === 'raffle' || page === 'display') ? 'raffle' : 'admin';
  
  return template.evaluate()
    .setTitle("Municipal Teachers' Day 2026 Raffle System - Malungon")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSettings() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.SETTINGS);
    if (!sheet) return getDefaultSettings();
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

function getPrizes() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PRIZES);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const prizes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const unitVal = Number(row[3]) || 0;
    const qty = Number(row[4]) || 0;
    const drawn = Number(row[5]) || 0;
    const remaining = Math.max(0, qty - drawn);
    
    prizes.push({
      id: String(row[0]),
      name: String(row[1]),
      description: String(row[2] || ''),
      unitValue: unitVal,
      quantity: qty,
      drawnQuantity: drawn,
      remainingQuantity: remaining,
      totalValue: unitVal * qty,
      status: remaining > 0 ? 'AVAILABLE' : 'EXHAUSTED'
    });
  }
  return prizes;
}

function getParticipants() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const participants = [];
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
    if (districtCounts[p.district] !== undefined) districtCounts[p.district]++;
    if (personnelCounts[p.personnelType] !== undefined) personnelCounts[p.personnelType]++;
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

function drawWinners(prizeId, options) {
  options = options || {};
  const mode = options.distributionMode || 'EQUAL_PER_DISTRICT';
  const winnersPerDistrict = Number(options.winnersPerDistrict) || 3;
  const combinedCount = Number(options.combinedCount) || 0;

  const prizes = getPrizes();
  const prize = prizes.find(p => p.id === prizeId);
  if (!prize) throw new Error('Selected prize not found.');
  if (prize.remainingQuantity <= 0) throw new Error('This prize has already been completely drawn.');
  
  const settings = getSettings();
  const participants = getParticipants();
  
  const eligiblePool = participants.filter(p => {
    if (p.eligible !== 'ELIGIBLE') return false;
    if (!settings.allowMultipleWins && p.winner === 'YES') return false;
    return true;
  });
  
  const districts = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'PRIVATE'];
  var selectedWinners = [];

  if (mode === 'EQUAL_PER_DISTRICT') {
    var totalNeeded = winnersPerDistrict * 5;
    if (totalNeeded > prize.remainingQuantity) {
      throw new Error('Requested winners (' + totalNeeded + ') exceeds remaining prize quantity (' + prize.remainingQuantity + ').');
    }

    // Verify each district has sufficient eligible participants
    for (var d = 0; d < districts.length; d++) {
      var distName = districts[d];
      var distPool = eligiblePool.filter(function(p) { return p.district === distName; });
      if (distPool.length < winnersPerDistrict) {
        throw new Error('Insufficient eligible participants in ' + distName + ' District. Needed: ' + winnersPerDistrict + ', Available: ' + distPool.length);
      }
    }

    // Pick winnersPerDistrict from each district
    for (var d2 = 0; d2 < districts.length; d2++) {
      var distName2 = districts[d2];
      var distPool2 = eligiblePool.filter(function(p) { return p.district === distName2; });
      var shuffled = fisherYatesShuffle(distPool2);
      var chosen = shuffled.slice(0, winnersPerDistrict);
      selectedWinners = selectedWinners.concat(chosen);
    }
  } else {
    var requiredWinners = combinedCount > 0 ? Math.min(combinedCount, prize.remainingQuantity) : prize.remainingQuantity;
    if (eligiblePool.length < requiredWinners) {
      throw new Error('Insufficient eligible participants. Needed: ' + requiredWinners + ', Available: ' + eligiblePool.length);
    }
    var shuffledPool = fisherYatesShuffle(eligiblePool);
    selectedWinners = shuffledPool.slice(0, requiredWinners);
  }
  
  const drawNumber = getNextDrawNumber();
  const timestamp = Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
  
  return {
    drawNumber: drawNumber,
    prize: prize,
    winners: selectedWinners,
    timestamp: timestamp,
    eligiblePoolSize: eligiblePool.length,
    distributionMode: mode,
    winnersPerDistrict: mode === 'EQUAL_PER_DISTRICT' ? winnersPerDistrict : undefined
  };
}

function getNextDrawNumber() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.RAFFLE_LOG);
  if (!sheet) return 'DRAW-0001';
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 'DRAW-0001';
  
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const drawStr = String(data[i][1] || '');
    const match = drawStr.match(/DRAW-(\\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return 'DRAW-' + ('0000' + (maxNum + 1)).slice(-4);
}

function confirmDraw(drawResult) {
  if (!drawResult || !drawResult.winners || !drawResult.prize) {
    throw new Error('Invalid draw result provided.');
  }
  const ss = getSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  
  try {
    const winnersSheet = ss.getSheetByName(SHEETS.WINNERS);
    const participantsSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
    const prizesSheet = ss.getSheetByName(SHEETS.PRIZES);
    const logSheet = ss.getSheetByName(SHEETS.RAFFLE_LOG);
    
    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'Asia/Manila', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, 'Asia/Manila', 'HH:mm:ss');
    const fullTimestamp = dateStr + ' ' + timeStr;
    
    const existingWinnersCount = Math.max(0, winnersSheet.getLastRow() - 1);
    const newWinnerRows = [];
    const winnerIds = [];
    
    drawResult.winners.forEach((w, idx) => {
      const winnerId = 'WN-' + ('0000' + (existingWinnersCount + idx + 1)).slice(-4);
      winnerIds.push(w.id);
      newWinnerRows.push([
        winnerId, w.id, w.fullName, w.district, w.personnelType, w.school,
        drawResult.prize.name, drawResult.drawNumber, dateStr, timeStr, 'UNCLAIMED', '', ''
      ]);
    });
    
    if (newWinnerRows.length > 0) {
      winnersSheet.getRange(winnersSheet.getLastRow() + 1, 1, newWinnerRows.length, 13).setValues(newWinnerRows);
    }
    
    const pData = participantsSheet.getDataRange().getValues();
    const winnerIdSet = new Set(winnerIds);
    for (let r = 1; r < pData.length; r++) {
      if (winnerIdSet.has(String(pData[r][0]))) {
        pData[r][11] = 'YES';
      }
    }
    participantsSheet.getDataRange().setValues(pData);
    
    const prizeData = prizesSheet.getDataRange().getValues();
    for (let p = 1; p < prizeData.length; p++) {
      if (String(prizeData[p][0]) === drawResult.prize.id) {
        const currentDrawn = Number(prizeData[p][5]) || 0;
        const newDrawn = currentDrawn + drawResult.winners.length;
        const totalQty = Number(prizeData[p][4]) || 0;
        const remaining = Math.max(0, totalQty - newDrawn);
        prizeData[p][5] = newDrawn;
        prizeData[p][6] = remaining;
        prizeData[p][8] = remaining <= 0 ? 'EXHAUSTED' : 'AVAILABLE';
        break;
      }
    }
    prizesSheet.getDataRange().setValues(prizeData);
    
    const logId = 'LOG-' + ('0000' + Math.max(1, logSheet.getLastRow())).slice(-4);
    logSheet.appendRow([
      logId, drawResult.drawNumber, fullTimestamp, drawResult.prize.id,
      drawResult.prize.name, drawResult.winners.length, drawResult.eligiblePoolSize,
      winnerIds.join(', '), 'CONFIRMED', Session.getActiveUser().getEmail() || 'Admin'
    ]);
    
    return { success: true, drawNumber: drawResult.drawNumber };
  } finally {
    lock.releaseLock();
  }
}

function cancelDraw(drawResult, reason) {
  try {
    const ss = getSpreadsheet();
    const logSheet = ss.getSheetByName(SHEETS.RAFFLE_LOG);
    if (!logSheet) return { success: true };
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
    const logId = 'LOG-' + ('0000' + Math.max(1, logSheet.getLastRow())).slice(-4);
    logSheet.appendRow([
      logId, drawResult.drawNumber, timestamp, drawResult.prize.id,
      drawResult.prize.name, drawResult.winners.length, drawResult.eligiblePoolSize,
      'DISCARDED', reason === 'REDRAW' ? 'REDRAWN' : 'CANCELLED',
      Session.getActiveUser().getEmail() || 'Admin'
    ]);
    return { success: true };
  } catch(e) {
    return { success: true };
  }
}

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
      winnerId: String(r[0]), participantId: String(r[1]), name: String(r[2]),
      district: String(r[3]), personnelType: String(r[4]), school: String(r[5]),
      prize: String(r[6]), drawNumber: String(r[7]), date: String(r[8]),
      time: String(r[9]), claimStatus: String(r[10] || 'UNCLAIMED')
    });
  }
  return winners;
}

function markPrizeClaimed(winnerId, claimedBy) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.WINNERS);
  const pSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
  if (!sheet) throw new Error('WINNERS sheet not found');
  const data = sheet.getDataRange().getValues();
  let participantId = '';
  const now = Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === winnerId) {
      data[i][10] = 'CLAIMED';
      data[i][11] = now;
      data[i][12] = claimedBy || 'Claims Officer';
      participantId = String(data[i][1]);
      break;
    }
  }
  sheet.getDataRange().setValues(data);
  
  if (participantId && pSheet) {
    const pData = pSheet.getDataRange().getValues();
    for (let j = 1; j < pData.length; j++) {
      if (String(pData[j][0]) === participantId) {
        pData[j][12] = 'YES';
        break;
      }
    }
    pSheet.getDataRange().setValues(pData);
  }
  return { success: true };
}
`;

export const GAS_SETUP_SHEETS_GS = `/**
 * =========================================================================
 * MUNICIPAL TEACHERS' DAY 2026 - ONE-CLICK SETUP SCRIPT
 * Run "runInitialSetup" once to automatically build and format all 5 sheets!
 * =========================================================================
 */

function runInitialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. SETTINGS
  let sSheet = ss.getSheetByName('SETTINGS') || ss.insertSheet('SETTINGS');
  sSheet.clear();
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
  sSheet.getRange(1, 1, settingsRows.length, 2).setValues(settingsRows);
  styleHeader(sSheet, 2);

  // 2. PRIZES
  let pzSheet = ss.getSheetByName('PRIZES') || ss.insertSheet('PRIZES');
  pzSheet.clear();
  const prizeHeaders = [
    ['Prize ID', 'Prize Name', 'Prize Description', 'Unit Value', 'Quantity', 'Drawn Quantity', 'Remaining Quantity', 'Total Value', 'Status']
  ];
  const samplePrizes = [
    ['P001', '₱500 Cash Prize', 'Teachers Day 2026 Cash Incentive Envelope', 500, 10, 0, 10, 5000, 'AVAILABLE'],
    ['P002', '₱1,000 Cash Prize', 'Educator Cash Grant Envelope', 1000, 6, 0, 6, 6000, 'AVAILABLE'],
    ['P003', 'Oscillating Stand Fan (16")', '16-inch high-velocity oscillating stand fan', 1500, 5, 0, 5, 7500, 'AVAILABLE'],
    ['P004', 'Automatic Rice Cooker (1.8L)', 'Multi-function electric non-stick rice cooker', 1800, 4, 0, 4, 7200, 'AVAILABLE'],
    ['P005', '₱2,000 Cash Prize', 'Executive educator cash prize', 2000, 3, 0, 3, 6000, 'AVAILABLE'],
    ['P006', 'Countertop Microwave Oven (20L)', 'Digital microwave oven', 3600, 2, 0, 2, 7200, 'AVAILABLE'],
    ['P007', '₱5,000 Grand Cash Prize', 'Municipal Teachers Day Grand Cash Bonanza', 5000, 2, 0, 2, 10000, 'AVAILABLE'],
    ['P008', '43" Smart Full HD LED TV', 'Smart Google TV with Dolby Audio', 14500, 1, 0, 1, 14500, 'AVAILABLE'],
    ['P009', 'Inverter Washing Machine (7.5kg)', 'Top-load energy-saving inverter washing machine', 13800, 1, 0, 1, 13800, 'AVAILABLE'],
    ['P010', 'Educator Laptop (Core i5 / 16GB)', 'Teacher digital classroom laptop workstation', 28500, 1, 0, 1, 28500, 'AVAILABLE']
  ];
  pzSheet.getRange(1, 1, 1, prizeHeaders[0].length).setValues(prizeHeaders);
  pzSheet.getRange(2, 1, samplePrizes.length, samplePrizes[0].length).setValues(samplePrizes);
  styleHeader(pzSheet, prizeHeaders[0].length);

  // 3. WINNERS
  let wSheet = ss.getSheetByName('WINNERS') || ss.insertSheet('WINNERS');
  wSheet.clear();
  const winnerHeaders = [
    ['Winner ID', 'Participant ID', 'Name', 'District', 'Personnel Type', 'School', 'Prize', 'Draw Number', 'Date', 'Time', 'Claim Status', 'Claimed At', 'Claimed By']
  ];
  wSheet.getRange(1, 1, 1, winnerHeaders[0].length).setValues(winnerHeaders);
  styleHeader(wSheet, winnerHeaders[0].length);

  // 4. RAFFLE_LOG
  let lSheet = ss.getSheetByName('RAFFLE_LOG') || ss.insertSheet('RAFFLE_LOG');
  lSheet.clear();
  const logHeaders = [
    ['Log ID', 'Draw Number', 'Timestamp', 'Prize ID', 'Prize Name', 'Number of Winners', 'Eligible Pool Size', 'Winner IDs', 'Status', 'Admin']
  ];
  lSheet.getRange(1, 1, 1, logHeaders[0].length).setValues(logHeaders);
  styleHeader(lSheet, logHeaders[0].length);

  // 5. PARTICIPANTS
  let ptSheet = ss.getSheetByName('PARTICIPANTS') || ss.insertSheet('PARTICIPANTS');
  if (ptSheet.getLastRow() <= 1) {
    ptSheet.clear();
    const partHeaders = [
      ['Participant ID', 'Last Name', 'First Name', 'Middle Name', 'Full Name', 'District', 'Personnel Type', 'School', 'Position', 'Contact Number', 'Eligible', 'Winner', 'Claimed', 'Status', 'Created At']
    ];
    ptSheet.getRange(1, 1, 1, partHeaders[0].length).setValues(partHeaders);
    styleHeader(ptSheet, partHeaders[0].length);
  }

  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);
  SpreadsheetApp.flush();
}

function styleHeader(sheet, numCols) {
  const header = sheet.getRange(1, 1, 1, numCols);
  header.setBackground('#EA580C');
  header.setFontColor('#FFFFFF');
  header.setFontWeight('bold');
  sheet.setFrozenRows(1);
  for (let c = 1; c <= numCols; c++) {
    sheet.autoResizeColumn(c);
  }
}
`;
