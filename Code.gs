const SHEET_NAME = 'FamilyBankAccounts';
const FIELDS = {
  accountTitle: 80, bankName: 120, accountName: 150, accountNumber: 30,
  owner: 30, accountType: 60, category: 60, note: 180
};
const HEADERS = ['id', ...Object.keys(FIELDS)];
const DASHBOARD_ORIGIN = 'https://laserpui.github.io';
const SESSION_PREFIX = 'DASHBOARD_SESSION_';
const SESSION_MS = 8 * 60 * 60 * 1000;

function doGet(event) {
  const channel = event?.parameter?.channel || '';
  if (!/^[a-f0-9-]{36}$/.test(channel)) {
    return HtmlService.createHtmlOutput('<p>เปิด Family Bank Manager บน GitHub Pages แล้วกดเชื่อม Google Sheets</p>');
  }

  requireOwner_();
  return HtmlService.createHtmlOutput(`
    <!doctype html><html lang="th"><head><meta charset="utf-8"><title>เชื่อม Google Sheets</title></head>
    <body>
      <h1>Family Bank Manager</h1>
      <p id="status">กำลังเชื่อมต่อกับหน้าเว็บ…</p>
      <script>
        const origin = ${JSON.stringify(DASHBOARD_ORIGIN)};
        const channel = ${JSON.stringify(channel)};
        const dashboard = window.top.opener;
        const allowed = ['createDashboardSession', 'getDashboardData', 'addAccount', 'updateAccount', 'deleteAccount'];
        const status = document.getElementById('status');
        if (!dashboard) {
          status.textContent = 'กลับไปเปิดหน้าต่างเชื่อมต่อจากปุ่มบน GitHub Pages อีกครั้ง';
        } else {
          window.addEventListener('message', event => {
            const request = event.data;
            if (event.source !== dashboard || event.origin !== origin || request?.channel !== channel
                || request.type !== 'family-bank-request' || typeof request.id !== 'string'
                || !allowed.includes(request.method) || !Array.isArray(request.args)) return;
            const reply = payload => dashboard.postMessage({
              type: 'family-bank-response', channel, id: request.id, ...payload
            }, origin);
            const runner = google.script.run.withSuccessHandler(result => reply({ result }))
              .withFailureHandler(error => {
                const message = String(error?.message || '').replace(/^Error:\\s*/, '');
                const safe = /^(บัญชี Google นี้ไม่มีสิทธิ์|กรุณา|หัวคอลัมน์|ข้อมูลบัญชี|เลขบัญชี|เจ้าของบัญชี|รหัสบัญชี|ไม่พบรายการ)/.test(message);
                reply({ error: safe ? message : 'Apps Script ทำรายการไม่สำเร็จ กรุณาตรวจบันทึกการดำเนินการ' });
              });
            runner[request.method](...request.args);
          });
          dashboard.postMessage({ type: 'family-bank-ready', channel }, origin);
          status.textContent = 'เชื่อมต่อแล้ว กลับไปที่หน้า GitHub Pages และเปิดหน้าต่างนี้ไว้ระหว่างใช้งาน';
        }
      </script>
    </body></html>
  `).setTitle('Family Bank Manager — Google Sheets')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Called from the existing owner-authorized Google window, never by doPost.
function createDashboardSession(token) {
  const settings = requireOwner_();
  if (!isSessionToken_(token)) throw new Error('ข้อมูลบัญชีสำหรับเปิดเซสชันไม่ถูกต้อง');
  return withLock_(() => {
    const now = Date.now();
    const expiresAt = now + SESSION_MS;
    const entries = Object.entries(settings.getProperties())
      .filter(([name]) => name.startsWith(SESSION_PREFIX));
    for (const [name, value] of entries) {
      if (!(Number(value) > now)) settings.deleteProperty(name);
    }
    settings.setProperty(sessionKey_(token), String(expiresAt));
    return { expiresAt };
  });
}

function doPost(event) {
  const json = payload => ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  const raw = event?.postData?.contents;
  if (typeof raw !== 'string' || raw.length > 6000) return json({ ok: false, code: 'INVALID_REQUEST' });
  let request;
  try {
    request = JSON.parse(raw);
  } catch (_) {
    return json({ ok: false, code: 'INVALID_REQUEST' });
  }
  if (!request || !isSessionToken_(request.token)) return json({ ok: false, code: 'AUTH_REQUIRED' });
  const settings = PropertiesService.getScriptProperties();
  const owner = (settings.getProperty('OWNER_EMAIL') || '').trim().toLowerCase();
  const executor = (Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!owner || executor !== owner) return json({ ok: false, code: 'AUTH_REQUIRED' });
  const key = sessionKey_(request.token);
  if (!(Number(settings.getProperty(key)) > Date.now())) return json({ ok: false, code: 'AUTH_REQUIRED' });
  try {
    return withLock_(() => {
      if (!(Number(settings.getProperty(key)) > Date.now())) return json({ ok: false, code: 'AUTH_REQUIRED' });
      if (request.method === 'logout') {
        settings.deleteProperty(key);
        return json({ ok: true });
      }
      if (!['getDashboardData', 'addAccount', 'updateAccount', 'deleteAccount'].includes(request.method)
          || !Array.isArray(request.args)) return json({ ok: false, code: 'INVALID_REQUEST' });
      return json({ ok: true, result: runAccountAction_(getSheet_(settings), request.method, request.args) });
    });
  } catch (error) {
    const message = String(error?.message || '');
    const expected = /^(กรุณา|หัวคอลัมน์|ข้อมูลบัญชี|เลขบัญชี|เจ้าของบัญชี|รหัสบัญชี|ไม่พบรายการ)/.test(message);
    return json({ ok: false, code: 'REQUEST_FAILED', message: expected ? message : 'Apps Script ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง' });
  }
}

function isSessionToken_(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

function sessionKey_(token) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8);
  return SESSION_PREFIX + Utilities.base64EncodeWebSafe(digest);
}

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
  return ownerAccountAction_('getDashboardData', []);
}

function addAccount(input) {
  return ownerAccountAction_('addAccount', [input]);
}

function updateAccount(id, input) {
  return ownerAccountAction_('updateAccount', [id, input]);
}

function deleteAccount(id) {
  return ownerAccountAction_('deleteAccount', [id]);
}

function ownerAccountAction_(method, args) {
  const settings = requireOwner_();
  return withLock_(() => runAccountAction_(getSheet_(settings), method, args));
}

function runAccountAction_(sheet, method, args) {
  if (method === 'getDashboardData') return { accounts: readRows_(sheet).map(row => row.account) };
  if (method === 'addAccount') {
    const account = { id: Utilities.getUuid(), ...validateAccount_(args[0]) };
    const row = sheet.getLastRow() + 1;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    writeAccount_(sheet, row, account);
    return account;
  }
  const [id, input] = args;
  const row = findRow_(sheet, id);
  if (method === 'deleteAccount') {
    sheet.deleteRow(row);
    return { id };
  }
  if (method !== 'updateAccount') throw new Error('ไม่รองรับคำขอนี้');
  const account = { id, ...validateAccount_(input) };
  writeAccount_(sheet, row, account);
  return account;
}

function requireOwner_() {
  const settings = PropertiesService.getScriptProperties();
  const owner = (settings.getProperty('OWNER_EMAIL') || '').trim().toLowerCase();
  const caller = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!owner || !caller || caller !== owner) throw new Error('บัญชี Google นี้ไม่มีสิทธิ์ใช้งาน');
  return settings;
}

function openBook_(settings = requireOwner_()) {
  const id = (settings.getProperty('SPREADSHEET_ID') || '').trim();
  if (!/^[\w-]+$/.test(id)) throw new Error('กรุณาตั้งค่า SPREADSHEET_ID ใน Apps Script');
  return SpreadsheetApp.openById(id);
}

function getSheet_(settings) {
  const sheet = openBook_(settings).getSheetByName(SHEET_NAME);
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

