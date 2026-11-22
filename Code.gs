const SHEET_NAME = 'FamilyBankAccounts';
const FIELDS = {
  accountTitle: 80, bankName: 120, accountName: 150, accountNumber: 30,
  owner: 30, accountType: 60, category: 60, note: 180
};
const HEADERS = ['id', ...Object.keys(FIELDS)];

function setupSheet() {
  return withLock_(() => {
    const book = openBook_();
    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
    }
    checkHeaders_(sheet);
    sheet.getRange('E:E').setNumberFormat('@');
    return { sheetName: SHEET_NAME };
  });
}

function getDashboardData() {
  return withLock_(() => ({ accounts: readRows_(getSheet_()).map(row => row.account) }));
}

function addAccount(input) {
  return withLock_(() => {
    const sheet = getSheet_();
    const account = { id: Utilities.getUuid(), ...validateAccount_(input) };
    const row = sheet.getLastRow() + 1;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    writeAccount_(sheet, row, account);
    return account;
  });
}

function updateAccount(id, input) {
  return withLock_(() => {
    const sheet = getSheet_();
    const row = findRow_(sheet, id);
    const account = { id, ...validateAccount_(input) };
    writeAccount_(sheet, row, account);
    return account;
  });
}

function deleteAccount(id) {
  return withLock_(() => {
    const sheet = getSheet_();
    sheet.deleteRow(findRow_(sheet, id));
    return { id };
  });
}

function openBook_() {
  const settings = PropertiesService.getScriptProperties();
  const owner = (settings.getProperty('OWNER_EMAIL') || '').trim().toLowerCase();
  const caller = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!owner || !caller || caller !== owner) throw new Error('บัญชี Google นี้ไม่มีสิทธิ์ใช้งาน');
  const id = (settings.getProperty('SPREADSHEET_ID') || '').trim();
  if (!/^[\w-]+$/.test(id)) throw new Error('กรุณาตั้งค่า SPREADSHEET_ID ใน Apps Script');
  return SpreadsheetApp.openById(id);
}

function getSheet_() {
  const sheet = openBook_().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('กรุณารัน setupSheet ใน Apps Script ก่อน');
  checkHeaders_(sheet);
  return sheet;
}

function checkHeaders_(sheet) {
  const columns = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (sheet.getLastColumn() !== HEADERS.length || HEADERS.some((name, i) => columns[i] !== name)) {
    throw new Error('หัวคอลัมน์ FamilyBankAccounts ไม่ตรงกับรูปแบบที่กำหนด');
  }
}

function readRows_(sheet) {
  const count = sheet.getLastRow() - 1;
  if (!count) return [];
  return sheet.getRange(2, 1, count, HEADERS.length).getDisplayValues()
    .map((values, index) => ({
      row: index + 2,
      account: Object.fromEntries(HEADERS.map((name, i) => [name, values[i]]))
    }))
    .filter(entry => entry.account.id);
}

function findRow_(sheet, id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error('รหัสบัญชีไม่ถูกต้อง');
  const matches = readRows_(sheet).filter(entry => entry.account.id === id);
  if (matches.length !== 1) throw new Error('ไม่พบรายการบัญชีที่ระบุ หรือรหัสรายการซ้ำ');
  return matches[0].row;
}

function validateAccount_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('ข้อมูลบัญชีไม่ถูกต้อง');
  const required = ['bankName', 'accountName', 'accountNumber', 'owner'];
  const result = {};
  for (const [name, limit] of Object.entries(FIELDS)) {
    const raw = input[name] ?? '';
    if (typeof raw !== 'string') throw new Error('ข้อมูลบัญชีต้องเป็นข้อความ');
    const value = raw.trim();
    if (value.length > limit || (required.includes(name) && !value)) throw new Error('กรุณาตรวจสอบช่องที่จำเป็นและความยาวของข้อมูล');
    result[name] = value;
  }
  if (!/^[0-9 -]+$/.test(result.accountNumber) || result.accountNumber.replace(/\D/g, '').length < 6) {
    throw new Error('เลขบัญชีต้องมีตัวเลขอย่างน้อย 6 หลัก ใช้ช่องว่างหรือขีดได้');
  }
  if (!['พ่อ', 'แม่', 'ลูกชาย', 'ลูกสาว'].includes(result.owner)) throw new Error('เจ้าของบัญชีไม่ถูกต้อง');
  return result;
}

function writeAccount_(sheet, row, account) {
  // RAW preserves leading zeros and treats values beginning with "=" as text.
  SpreadsheetApp.flush();
  Sheets.Spreadsheets.Values.update(
    { values: [HEADERS.map(name => account[name])] },
    sheet.getParent().getId(),
    `'${SHEET_NAME}'!A${row}:I${row}`,
    { valueInputOption: 'RAW' }
  );
}

function withLock_(operation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const result = operation();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

