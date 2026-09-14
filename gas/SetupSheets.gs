/**
 * =========================================================================
 * MUNICIPAL TEACHERS' DAY 2026 - ONE-CLICK GOOGLE SHEETS SETUP SCRIPT
 * Municipality of Malungon, Sarangani Province
 * =========================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Spreadsheet (https://sheets.new).
 * 2. Click Extensions > Apps Script.
 * 3. Paste this file as "SetupSheets.gs" and paste "Code.gs" as "Code.gs".
 * 4. In the function dropdown at the top, select "runInitialSetup".
 * 5. Click "Run" and grant permissions.
 * 6. That's it! All 5 required sheets (PARTICIPANTS, PRIZES, WINNERS, RAFFLE_LOG, SETTINGS)
 *    will be automatically created, formatted with Malungon Teachers' Day Orange headers,
 *    freeze panes, and sample prizes!
 */

function runInitialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. SETTINGS SHEET
  let settingsSheet = ss.getSheetByName('SETTINGS');
  if (!settingsSheet) settingsSheet = ss.insertSheet('SETTINGS');
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
  styleHeader(settingsSheet, 2);

  // 2. PRIZES SHEET
  let prizesSheet = ss.getSheetByName('PRIZES');
  if (!prizesSheet) prizesSheet = ss.insertSheet('PRIZES');
  prizesSheet.clear();
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
  prizesSheet.getRange(1, 1, 1, prizeHeaders[0].length).setValues(prizeHeaders);
  prizesSheet.getRange(2, 1, samplePrizes.length, samplePrizes[0].length).setValues(samplePrizes);
  styleHeader(prizesSheet, prizeHeaders[0].length);

  // 3. WINNERS SHEET
  let winnersSheet = ss.getSheetByName('WINNERS');
  if (!winnersSheet) winnersSheet = ss.insertSheet('WINNERS');
  winnersSheet.clear();
  const winnerHeaders = [
    ['Winner ID', 'Participant ID', 'Name', 'District', 'Personnel Type', 'School', 'Prize', 'Draw Number', 'Date', 'Time', 'Claim Status', 'Claimed At', 'Claimed By']
  ];
  winnersSheet.getRange(1, 1, 1, winnerHeaders[0].length).setValues(winnerHeaders);
  styleHeader(winnersSheet, winnerHeaders[0].length);

  // 4. RAFFLE_LOG SHEET
  let logSheet = ss.getSheetByName('RAFFLE_LOG');
  if (!logSheet) logSheet = ss.insertSheet('RAFFLE_LOG');
  logSheet.clear();
  const logHeaders = [
    ['Log ID', 'Draw Number', 'Timestamp', 'Prize ID', 'Prize Name', 'Number of Winners', 'Eligible Pool Size', 'Winner IDs', 'Status', 'Admin']
  ];
  logSheet.getRange(1, 1, 1, logHeaders[0].length).setValues(logHeaders);
  styleHeader(logSheet, logHeaders[0].length);

  // 5. PARTICIPANTS SHEET
  let partSheet = ss.getSheetByName('PARTICIPANTS');
  if (!partSheet) partSheet = ss.insertSheet('PARTICIPANTS');
  if (partSheet.getLastRow() <= 1) {
    partSheet.clear();
    const partHeaders = [
      ['Participant ID', 'Last Name', 'First Name', 'Middle Name', 'Full Name', 'District', 'Personnel Type', 'School', 'Position', 'Contact Number', 'Eligible', 'Winner', 'Claimed', 'Status', 'Created At']
    ];
    partSheet.getRange(1, 1, 1, partHeaders[0].length).setValues(partHeaders);
    styleHeader(partSheet, partHeaders[0].length);
  }

  // Remove default "Sheet1" if present
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.flush();
  Logger.log('Setup completed successfully!');
}

function styleHeader(sheet, numCols) {
  const header = sheet.getRange(1, 1, 1, numCols);
  header.setBackground('#EA580C'); // Vibrant Malungon Orange
  header.setFontColor('#FFFFFF');
  header.setFontWeight('bold');
  sheet.setFrozenRows(1);
  for (let c = 1; c <= numCols; c++) {
    sheet.autoResizeColumn(c);
  }
}
