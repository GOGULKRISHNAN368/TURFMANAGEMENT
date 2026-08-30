function getGoogleConfig() {
  return {
    projectId: process.env.GOOGLE_PROJECT_ID,
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
  };
}

function configured() {
  const config = getGoogleConfig();
  return Boolean(config.projectId && config.clientEmail && config.privateKey);
}

async function syncRegistrationSheet(sport) {
  if (!configured()) {
    return {
      ok: false,
      code: 'GOOGLE_NOT_CONFIGURED',
      message: 'Google Sheets credentials are not configured. No rows were imported.',
      imported: 0,
      flagged: 0,
    };
  }

  let google;
  try { ({ google } = require('googleapis')); } catch {
    return { ok:false, code:'GOOGLE_CLIENT_MISSING', message:'Google credentials are present, but the googleapis package is not installed. Run npm install.', imported:0, flagged:0, rows:[] };
  }
  const config = getGoogleConfig();
  const sheetId = sport === 'football' ? process.env.GOOGLE_FOOTBALL_SHEET_ID : process.env.GOOGLE_CRICKET_SHEET_ID;
  const range = sport === 'football' ? process.env.GOOGLE_FOOTBALL_SHEET_RANGE : process.env.GOOGLE_CRICKET_SHEET_RANGE;
  if (!sheetId || !range) return { ok:false, code:'GOOGLE_SHEET_NOT_CONFIGURED', message:`${sport} Sheet ID or range is missing.`, imported:0, flagged:0, rows:[] };
  try {
    const auth = new google.auth.JWT({ email:config.clientEmail, key:config.privateKey.replace(/\\n/g, '\n'), scopes:['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    const sheets = google.sheets({ version:'v4', auth });
    const result = await sheets.spreadsheets.values.get({ spreadsheetId:sheetId, range });
    const values = result.data.values || [];
    if (!values.length) return { ok:true, code:'GOOGLE_EMPTY_SHEET', message:`${sport} Sheet has no response rows.`, imported:0, flagged:0, rows:[] };
    const headers = values[0].map(normalizeHeader);
    const rows = values.slice(1).filter((row) => row.some(Boolean)).map((row) => normalizeRow(headers, row, sport));
    return { ok:true, code:'GOOGLE_SYNC_READY', message:`Read ${rows.length} ${sport} response row${rows.length === 1 ? '' : 's'} from Google Sheets.`, imported:rows.length, flagged:0, rows };
  } catch (error) {
    return { ok:false, code:'GOOGLE_READ_FAILED', message:`Google Sheets read failed: ${error.message}`, imported:0, flagged:0, rows:[] };
  }
}

function normalizeHeader(header) { return String(header || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function cell(headers, row, names) { const index = names.map(normalizeHeader).map((name) => headers.indexOf(name)).find((index) => index >= 0); return index === undefined ? '' : String(row[index] || '').trim(); }
function normalizeRow(headers, row, sport) {
  const responseTimestamp = cell(headers, row, ['timestamp', 'response timestamp']) || new Date().toISOString();
  const teamName = cell(headers, row, ['team name', 'team']);
  const captainName = cell(headers, row, ['team captain name', 'captain name', 'captain']);
  const phone = cell(headers, row, ['captain mobile number', 'captain phone', 'captain mobile']);
  const email = cell(headers, row, ['captain email', 'email']);
  const transactionId = cell(headers, row, ['upi transaction id utr number', 'upi transaction id utr', 'transaction id utr', 'utr']);
  const players = [];
  for (let number = 1; number <= (sport === 'football' ? 12 : 15); number += 1) {
    const name = cell(headers, row, [`player ${number} name`]); if (!name) continue;
    const role = cell(headers, row, [`player ${number} position`, `player ${number} role`]);
    players.push({ name, jerseyNumber:Number(cell(headers,row,[`player ${number} jersey number`])) || null, ...(sport === 'football' ? { position:role } : { role }) });
  }
  return {
    sport, source:'GOOGLE_SHEETS', sourceKey:`${sport}|${responseTimestamp}|${teamName.toLowerCase()}|${phone}|${transactionId}`,
    googleResponseTimestamp:responseTimestamp, teamDetails:{ name:teamName, city:cell(headers,row,['team city area','city area','city']), primaryColour:cell(headers,row,['jersey primary colour','jersey primary color']), secondaryColour:cell(headers,row,['jersey secondary colour','jersey secondary color']) },
    captainDetails:{ name:captainName, phone, whatsapp:cell(headers,row,['captain whatsapp number','captain whatsapp']) || phone, email }, submittedPlayers:players,
    expectedAmount:0, claimedAmount:Number(cell(headers,row,['amount paid','claimed amount']).replace(/[^0-9.]/g,'')) || 0, transactionId,
    paymentDate:cell(headers,row,['payment date']), paymentTime:cell(headers,row,['approximate payment time','payment time']), paymentApplication:cell(headers,row,['payment application used','payment application']), paymentScreenshotUrl:cell(headers,row,['payment screenshot','payment screenshot link']), paymentStatus:'PENDING_VERIFICATION', registrationStatus:'PENDING', duplicateFlags:[], rawGoogleResponse:Object.fromEntries(headers.map((header,index) => [header,row[index] || '']))
  };
}

module.exports = { configured, syncRegistrationSheet };
