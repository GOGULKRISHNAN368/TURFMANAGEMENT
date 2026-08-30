const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { readStore, updateStore } = require('./data/store');
const { syncRegistrationSheet } = require('./services/googleSheets');
const { applyFootballEvent, undoFootballEvent } = require('./scoring/football');
const { applyDelivery, undoDelivery, oversDisplay, currentRunRate, requiredRunRate } = require('./scoring/cricket');
const root = path.join(__dirname, '..');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

loadEnv(path.join(root, '.env'));
loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 4010);
const clients = new Set();
const sessions = new Map();
const rolePermissions = {
  SUPER_ADMIN: ['*'],
  TOURNAMENT_ADMIN: ['teams:manage', 'fixtures:manage', 'results:manage', 'settings:manage'],
  REGISTRATION_ADMIN: ['registration:sync', 'registration:review'],
  FOOTBALL_SCORER: ['football:score'],
  CRICKET_SCORER: ['cricket:score'],
};

function json(res, status, payload) {
  const output = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(output);
}

function publicTeam(team) {
  const { captain, ...safe } = team;
  return safe;
}

function publicMatch(match) {
  return match;
}

function publicTournament(db) {
  const tournament = db.tournament;
  const footballConfirmed = db.teams.filter((team) => team.sport === 'football' && team.isPublic).length;
  const cricketConfirmed = db.teams.filter((team) => team.sport === 'cricket' && team.isPublic).length;
  return { ...tournament, footballConfirmed, cricketConfirmed, footballRemaining: Math.max(0, tournament.footballMaxTeams - footballConfirmed), cricketRemaining: Math.max(0, tournament.cricketMaxTeams - cricketConfirmed) };
}

function sendLiveEvent(payload) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) client.write(message);
}

function audit(db, action, entity, detail, admin = 'Aarav Menon') {
  db.auditLogs.unshift({ id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`, action, entity, admin, at: new Date().toISOString(), detail });
}

function slugify(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function nextTeamCode(db, sport) {
  const key = sport === 'football' ? 'footballTeam' : 'cricketTeam';
  db.counters[key] = Number(db.counters[key] || 0) + 1;
  return `${sport === 'football' ? 'FB' : 'CR'}-${String(db.counters[key]).padStart(3, '0')}`;
}

function approveRegistration(db, registration, admin = 'adm-1', overrideSlots = false) {
  if (registration.paymentStatus !== 'VERIFIED') throw new Error('Payment must be VERIFIED before a team can be approved.');
  if (registration.registrationStatus === 'APPROVED' && registration.createdTeamId) return db.teams.find((team) => team.id === registration.createdTeamId);
  const maxSlots = registration.sport === 'football' ? db.tournament.footballMaxTeams : db.tournament.cricketMaxTeams;
  const filledSlots = db.teams.filter((team) => team.sport === registration.sport && team.isPublic).length;
  if (filledSlots >= maxSlots && !overrideSlots) throw new Error('All team slots are filled. Move this registration to WAITLISTED or use a Super Admin override.');
  const teamCode = nextTeamCode(db, registration.sport);
  const team = {
    id: `team-${crypto.randomUUID()}`, tournamentId: registration.tournamentId, sport: registration.sport, teamCode,
    name: registration.teamDetails.name, slug: slugify(registration.teamDetails.name), city: registration.teamDetails.city,
    primaryColour: registration.teamDetails.primaryColour, secondaryColour: registration.teamDetails.secondaryColour,
    captain: registration.captainDetails.name, players: registration.submittedPlayers.length, group: null, status: 'APPROVED',
    isPublic: true, registrationId: registration.id, accent: registration.sport === 'football' ? 'orange' : 'blue', form: '—'
  };
  db.teams.push(team);
  registration.registrationStatus = 'APPROVED';
  registration.approvedAt = new Date().toISOString(); registration.approvedBy = admin; registration.createdTeamId = team.id;
  audit(db, 'APPROVED_REGISTRATION', registration.id, `${teamCode} created after verified payment.`);
  return team;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 2_000_000) req.destroy(); });
    req.on('end', () => { if (!raw) return resolve({}); try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON body')); } });
    req.on('error', reject);
  });
}

function requireAdmin(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || !sessions.has(token)) { json(res, 401, { error: 'Admin authentication required' }); return null; }
  return sessions.get(token);
}

function can(admin, permission) { return (rolePermissions[admin.role] || []).includes('*') || (rolePermissions[admin.role] || []).includes(permission); }
function requirePermission(admin, permission, res) { if (!can(admin, permission)) { json(res, 403, { error:`Your role does not allow ${permission}.` }); return false; } return true; }

function mime(file) {
  return { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' }[path.extname(file)] || 'text/plain; charset=utf-8';
}

function serveStatic(req, res) {
  const urlPath = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  let relative;
  if (urlPath === '/admin' || urlPath === '/admin/') relative = 'admin/index.html';
  else if (urlPath === '/admin.css') relative = 'admin/admin.css';
  else if (urlPath === '/admin.js') relative = 'admin/admin.js';
  else if (urlPath === '/football' || urlPath === '/cricket' || urlPath === '/register') relative = 'turf/index.html';
  else relative = urlPath === '/' ? 'turf/index.html' : `turf${urlPath}`;
  if (relative.endsWith('/')) relative += 'index.html';
  const filePath = path.resolve(root, relative.replace(/^[/\\]+/, ''));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return json(res, 404, { error: 'Not found' });
  res.writeHead(200, { 'Content-Type': mime(filePath), 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const db = readStore();

  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' }); return res.end(); }

  if (url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'nightleague-backend', time: new Date().toISOString() });

  if (req.method === 'POST' && url.pathname === '/api/admin/auth/login') {
    const body = await parseBody(req);
    const admin = db.admins.find((item) => item.email.toLowerCase() === String(body.email || '').toLowerCase());
    if (!admin || body.password !== 'nightleague-demo') return json(res, 401, { error: 'Invalid admin credentials' });
    const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, admin);
    return json(res, 200, { token, admin: { ...admin, permissions: rolePermissions[admin.role] || [] } });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/auth/logout') {
    const token = (req.headers.authorization || '').replace('Bearer ', ''); sessions.delete(token); return json(res, 200, { ok:true });
  }

  if (parts[1] === 'public') {
    if (req.method === 'GET' && url.pathname === '/api/public/tournament') return json(res, 200, { tournament: publicTournament(db) });
    if (req.method === 'GET' && url.pathname === '/api/public/teams') return json(res, 200, { teams: db.teams.filter((team) => team.isPublic && (!url.searchParams.get('sport') || team.sport === url.searchParams.get('sport'))).map(publicTeam) });
    if (req.method === 'GET' && url.pathname === '/api/public/fixtures') return json(res, 200, { fixtures: db.fixtures.filter((fixture) => !url.searchParams.get('sport') || fixture.sport === url.searchParams.get('sport')) });
    if (req.method === 'GET' && url.pathname === '/api/public/live') return json(res, 200, { matches: db.matches.filter((match) => match.status === 'LIVE').map(publicMatch), serverTime: new Date().toISOString() });
    if (req.method === 'GET' && url.pathname === '/api/public/standings') return json(res, 200, { standings: db.standings[url.searchParams.get('sport') || 'football'] || [] });
    if (req.method === 'GET' && url.pathname === '/api/public/statistics') return json(res, 200, { leaders: [{ label: 'Top scorer', name: 'Ravi Menon', value: '4 goals', sport: 'football' }, { label: 'Best batting', name: 'Rahul Nair', value: '42*', sport: 'cricket' }, { label: 'Best bowling', name: 'Karthik S', value: '2 / 18', sport: 'cricket' }] });
    if (req.method === 'GET' && parts[2] === 'matches' && parts[3]) { const match = db.matches.find((item) => item.id === parts[3]); return match ? json(res, 200, { match: publicMatch(match) }) : json(res, 404, { error: 'Match not found' }); }
    if (req.method === 'GET' && url.pathname === '/api/public/live/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
      res.write(`data: ${JSON.stringify({ type: 'connected', matches: db.matches.filter((match) => match.status === 'LIVE') })}\n\n`);
      clients.add(res); req.on('close', () => clients.delete(res)); return;
    }
  }

  const admin = requireAdmin(req, res); if (!admin) return;
  if (req.method === 'GET' && url.pathname === '/api/admin/dashboard') {
    const pending = db.registrations.filter((r) => r.registrationStatus === 'PENDING').length;
    return json(res, 200, { stats: { pendingRegistrations: pending, pendingPayments: db.registrations.filter((r) => r.paymentStatus === 'PENDING_VERIFICATION').length, confirmedTeams: db.teams.filter((t) => t.isPublic).length, liveMatches: db.matches.filter((m) => m.status === 'LIVE').length }, recentRegistrations: db.registrations.slice(0, 5).map((r) => ({ id:r.id, sport:r.sport, team:r.teamDetails.name, captain:r.captainDetails.name, amount:r.claimedAmount, paymentStatus:r.paymentStatus, registrationStatus:r.registrationStatus, flags:r.duplicateFlags })) });
  }
  if (req.method === 'PATCH' && url.pathname === '/api/admin/tournament') {
    if (!requirePermission(admin, 'settings:manage', res)) return;
    const body = await parseBody(req); const allowed = ['name','venue','closingDate','upiId','organizerName','whatsappNumber','footballFormUrl','cricketFormUrl','footballFee','cricketFee'];
    for (const key of allowed) if (body[key] !== undefined && body[key] !== '') db.tournament[key] = ['footballFee','cricketFee'].includes(key) ? Number(body[key]) : body[key];
    audit(db, 'UPDATED_TOURNAMENT_SETTINGS', db.tournament.id, 'Public registration and payment settings updated.', admin.name); updateStore(() => db); return json(res, 200, { tournament: publicTournament(db) });
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/registrations') {
    const sport = url.searchParams.get('sport'); const search = String(url.searchParams.get('search') || '').toLowerCase();
    const registrations = db.registrations.filter((r) => (!sport || r.sport === sport) && (!search || `${r.teamDetails.name} ${r.captainDetails.name} ${r.transactionId}`.toLowerCase().includes(search)));
    return json(res, 200, { registrations, total: registrations.length });
  }
  if (req.method === 'GET' && parts[1] === 'admin' && parts[2] === 'registrations' && parts[3] && parts.length === 4) { const reg = db.registrations.find((r) => r.id === parts[3]); return reg ? json(res, 200, { registration: reg }) : json(res, 404, { error:'Registration not found' }); }
  if (req.method === 'POST' && parts[1] === 'admin' && parts[2] === 'registrations' && parts[3] === 'sync') {
    if (!requirePermission(admin, 'registration:sync', res)) return;
    const result = await syncRegistrationSheet(parts[4]);
    if (result.ok && Array.isArray(result.rows)) {
      const sport = parts[4] === 'football' ? 'football' : 'cricket';
      const expectedAmount = sport === 'football' ? db.tournament.footballFee : db.tournament.cricketFee;
      let imported = 0; let flagged = 0;
      for (const row of result.rows) {
        if (db.registrations.some((item) => item.sourceKey === row.sourceKey)) continue;
        row.id = `reg-${crypto.randomUUID()}`; row.tournamentId = db.tournament.id; row.expectedAmount = expectedAmount; row.importedAt = new Date().toISOString(); row.lastSynchronizedAt = row.importedAt;
        const flags = [];
        if (db.registrations.some((item) => item.transactionId && item.transactionId === row.transactionId)) flags.push('DUPLICATE_UTR');
        if (db.registrations.some((item) => item.teamDetails.name.toLowerCase() === row.teamDetails.name.toLowerCase())) flags.push('DUPLICATE_TEAM');
        if (db.registrations.some((item) => item.captainDetails.phone === row.captainDetails.phone)) flags.push('DUPLICATE_PHONE');
        if (db.registrations.some((item) => item.captainDetails.email && item.captainDetails.email.toLowerCase() === row.captainDetails.email.toLowerCase())) flags.push('DUPLICATE_EMAIL');
        if (row.claimedAmount !== expectedAmount) flags.push('AMOUNT_MISMATCH');
        if (!row.paymentScreenshotUrl) flags.push('SCREENSHOT_MISSING');
        const jerseyNumbers = row.submittedPlayers.map((player) => player.jerseyNumber).filter(Boolean);
        if (new Set(jerseyNumbers).size !== jerseyNumbers.length) flags.push('DUPLICATE_JERSEY_NUMBER');
        if (row.submittedPlayers.length < (sport === 'football' ? 7 : 11)) flags.push('PLAYER_COUNT_INVALID');
        row.duplicateFlags = [...new Set(flags)]; if (row.duplicateFlags.length) flagged += 1; db.registrations.push(row); imported += 1;
      }
      result.imported = imported; result.flagged = flagged;
    }
    audit(db, 'SYNC_GOOGLE_SHEET', parts[4], result.message); updateStore(() => db);
    return json(res, result.ok ? 200 : 503, result);
  }
  if (req.method === 'PATCH' && parts[1] === 'admin' && parts[2] === 'registrations' && parts[3] && parts[4] === 'payment') {
    if (!requirePermission(admin, 'registration:review', res)) return;
    const body = await parseBody(req); const reg = db.registrations.find((r) => r.id === parts[3]);
    if (!reg) return json(res, 404, { error:'Registration not found' });
    if (body.status === 'VERIFIED') {
      if (Number(body.receivedAmount) !== Number(reg.expectedAmount)) return json(res, 400, { error: 'Received amount does not match the expected fee.' });
      reg.paymentStatus = 'VERIFIED'; reg.verifiedAt = new Date().toISOString(); reg.verifiedBy = admin.id; reg.verificationNotes = body.note || '';
    } else if (['NOT_FOUND','AMOUNT_MISMATCH','DUPLICATE_TRANSACTION','FAILED','REFUNDED'].includes(body.status)) reg.paymentStatus = body.status;
    else return json(res, 400, { error:'Unsupported payment status' });
    audit(db, `PAYMENT_${reg.paymentStatus}`, reg.id, body.note || 'Payment status updated.', admin.name); updateStore(() => db); sendLiveEvent({ type:'registration-updated', registrationId:reg.id });
    return json(res, 200, { registration: reg });
  }
  if (req.method === 'PATCH' && parts[1] === 'admin' && parts[2] === 'registrations' && parts[3] && parts[4] === 'status') {
    if (!requirePermission(admin, 'registration:review', res)) return;
    const body = await parseBody(req); const reg = db.registrations.find((r) => r.id === parts[3]);
    if (!reg) return json(res, 404, { error:'Registration not found' });
    if (body.status === 'APPROVED') { try { approveRegistration(db, reg, admin.id); } catch (error) { return json(res, 422, { error: error.message }); } }
    else if (['PENDING','REJECTED','WAITLISTED','CANCELLED'].includes(body.status)) { reg.registrationStatus = body.status; audit(db, `REGISTRATION_${body.status}`, reg.id, body.note || '', admin.name); }
    else return json(res, 400, { error:'Unsupported registration status' });
    updateStore(() => db); return json(res, 200, { registration: reg, team: reg.createdTeamId ? db.teams.find((t) => t.id === reg.createdTeamId) : null });
  }
  if (req.method === 'POST' && parts[1] === 'admin' && parts[2] === 'registrations' && parts[3] && parts[4] === 'verify-and-approve') {
    if (!requirePermission(admin, 'registration:review', res)) return;
    const body = await parseBody(req); const reg = db.registrations.find((r) => r.id === parts[3]);
    if (!reg) return json(res, 404, { error:'Registration not found' });
    if (!body.confirmed || String(body.transactionId) !== String(reg.transactionId)) return json(res, 422, { error:'Confirm the bank transaction and enter the matching UTR.' });
    if (Number(body.receivedAmount) !== Number(reg.expectedAmount)) return json(res, 422, { error:'The received amount must exactly match the expected fee.' });
    reg.paymentStatus = 'VERIFIED'; reg.verifiedAt = new Date().toISOString(); reg.verifiedBy = admin.id; reg.verificationNotes = body.note || '';
    const team = approveRegistration(db, reg, admin.id, Boolean(body.overrideSlots && admin.role === 'SUPER_ADMIN')); audit(db, 'VERIFY_AND_APPROVE', reg.id, `Verified ${reg.transactionId} for ₹${reg.expectedAmount}.`, admin.name); updateStore(() => db); sendLiveEvent({ type:'team-approved', team });
    return json(res, 200, { registration: reg, team });
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/registrations/manual') {
    if (!requirePermission(admin, 'registration:review', res)) return;
    const body = await parseBody(req); const sport = body.sport === 'cricket' ? 'cricket' : 'football'; const expectedAmount = sport === 'football' ? db.tournament.footballFee : db.tournament.cricketFee;
    if (!body.teamName || !body.captainName || !body.phone) return json(res, 422, { error:'Team name, captain name, and phone are required.' });
    const registration = { id:`reg-${crypto.randomUUID()}`, tournamentId:db.tournament.id, sport, source:'MANUAL', sourceKey:`manual|${Date.now()}|${slugify(body.teamName)}|${body.phone}`, teamDetails:{name:body.teamName,city:body.city || 'Bengaluru',primaryColour:body.primaryColour || '—',secondaryColour:body.secondaryColour || '—'}, captainDetails:{name:body.captainName,phone:body.phone,whatsapp:body.whatsapp || body.phone,email:body.email || ''}, submittedPlayers:Array.isArray(body.players) ? body.players : [], expectedAmount, claimedAmount:Number(body.claimedAmount || 0), transactionId:body.transactionId || '', paymentScreenshotUrl:body.paymentScreenshotUrl || '', paymentStatus:body.paymentStatus || 'PENDING_VERIFICATION', registrationStatus:'PENDING', duplicateFlags:[], adminNotes:body.adminNotes || '', importedAt:new Date().toISOString(), rawGoogleResponse:null };
    if (registration.claimedAmount !== expectedAmount) registration.duplicateFlags.push('AMOUNT_MISMATCH'); if (!registration.paymentScreenshotUrl) registration.duplicateFlags.push('SCREENSHOT_MISSING');
    db.registrations.unshift(registration); audit(db,'CREATED_MANUAL_REGISTRATION',registration.id,`${sport} registration for ${registration.teamDetails.name}.`,admin.name); updateStore(() => db); return json(res,201,{registration});
  }
  if (req.method === 'GET' && url.pathname === '/api/admin/teams') return json(res, 200, { teams: db.teams });
  if (req.method === 'GET' && url.pathname === '/api/admin/fixtures') return json(res, 200, { fixtures: db.fixtures });
  if (req.method === 'GET' && url.pathname === '/api/admin/matches') return json(res, 200, { matches: db.matches });
  if (req.method === 'GET' && url.pathname === '/api/admin/audit-logs') return json(res, 200, { auditLogs: db.auditLogs.slice(0, 50) });
  if (req.method === 'POST' && url.pathname === '/api/admin/fixtures/generate') {
    if (!requirePermission(admin, 'fixtures:manage', res)) return;
    const body = await parseBody(req); const sport = body.sport || 'football'; const teams = db.teams.filter((t) => t.sport === sport && t.isPublic);
    let added = 0; for (let i = 0; i < teams.length; i += 1) for (let j = i + 1; j < teams.length; j += 1) { if (db.fixtures.some((f) => f.teamACode === teams[i].teamCode && f.teamBCode === teams[j].teamCode)) continue; db.fixtures.push({ id:`fix-${Date.now()}-${added}`, sport, round:'GROUP STAGE', date:'20 OCT', time:'18:30', venue:'Arena 9', teamA:teams[i].name, teamB:teams[j].name, teamACode:teams[i].teamCode, teamBCode:teams[j].teamCode, status:'UPCOMING', matchId:null }); added += 1; }
    audit(db, 'GENERATE_FIXTURES', sport, `${added} fixtures generated.`, admin.name); updateStore(() => db); return json(res, 200, { added, fixtures: db.fixtures });
  }
  if (req.method === 'POST' && parts[1] === 'admin' && parts[2] === 'football' && parts[3] === 'matches' && parts[4] && parts[5] === 'events') {
    if (!requirePermission(admin, 'football:score', res)) return;
    const body = await parseBody(req); const match = db.matches.find((m) => m.id === parts[4]); if (!match) return json(res,404,{error:'Match not found'}); if (match.status === 'COMPLETED') return json(res,409,{error:'Match is already completed'});
    try { const next = applyFootballEvent(match, body); Object.assign(match, next); db.footballEvents.push({ matchId:match.id, ...body, createdBy:admin.id, createdAt:new Date().toISOString() }); updateStore(() => db); sendLiveEvent({type:'football-score', match}); return json(res,200,{match}); } catch(error) { return json(res,422,{error:error.message}); }
  }
  if (req.method === 'DELETE' && parts[1] === 'admin' && parts[2] === 'football' && parts[3] === 'matches' && parts[4] && parts[5] === 'events' && parts[6] === 'last') {
    if (!requirePermission(admin, 'football:score', res)) return;
    const match = db.matches.find((m) => m.id === parts[4]); if (!match) return json(res,404,{error:'Match not found'}); Object.assign(match, undoFootballEvent(match)); audit(db,'UNDO_FOOTBALL_EVENT',match.id,'Last football action reversed.',admin.name); updateStore(() => db); sendLiveEvent({type:'football-score',match}); return json(res,200,{match});
  }
  if (req.method === 'POST' && parts[1] === 'admin' && parts[2] === 'cricket' && parts[3] === 'matches' && parts[4] && parts[5] === 'deliveries') {
    if (!requirePermission(admin, 'cricket:score', res)) return;
    const body = await parseBody(req); const match = db.matches.find((m) => m.id === parts[4]); if (!match) return json(res,404,{error:'Match not found'}); if (match.status === 'COMPLETED') return json(res,409,{error:'Match is already completed'});
    try { const state = applyDelivery({ ...(match.score || {}), deliveries: match.deliveries || [] }, body); match.score = { ...(match.score || {}), runs:state.runs, wickets:state.wickets, legalBalls:state.legalBalls, ballsPerOver:state.ballsPerOver }; match.deliveries = state.deliveries; match.overs = oversDisplay(state.legalBalls,state.ballsPerOver); match.crr = currentRunRate(state.runs,state.legalBalls,state.ballsPerOver); match.rrr = requiredRunRate(match.target || 0,state.runs,Math.max(0,120-state.legalBalls),state.ballsPerOver); match.recent = state.deliveries.slice(-6).map((delivery) => delivery.isWicket ? 'W' : String(delivery.totalRuns)); match.version = Number(match.version || 0) + 1; updateStore(() => db); sendLiveEvent({type:'cricket-score',match}); return json(res,200,{match}); } catch(error) { return json(res,422,{error:error.message}); }
  }
  if (req.method === 'DELETE' && parts[1] === 'admin' && parts[2] === 'cricket' && parts[3] === 'matches' && parts[4] && parts[5] === 'deliveries' && parts[6] === 'last') {
    if (!requirePermission(admin, 'cricket:score', res)) return;
    const match = db.matches.find((m) => m.id === parts[4]); if (!match) return json(res,404,{error:'Match not found'}); const state = undoDelivery({ ...(match.score || {}), deliveries: match.deliveries || [] }); match.score = { ...(match.score || {}), runs:state.runs, wickets:state.wickets, legalBalls:state.legalBalls, ballsPerOver:state.ballsPerOver }; match.deliveries = state.deliveries; match.overs = oversDisplay(state.legalBalls,state.ballsPerOver); audit(db,'UNDO_CRICKET_DELIVERY',match.id,'Last cricket delivery reversed.',admin.name); updateStore(() => db); sendLiveEvent({type:'cricket-score',match}); return json(res,200,{match});
  }

  return json(res, 404, { error: 'API route not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error:'Method not allowed' });
    return serveStatic(req, res);
  } catch (error) {
    console.error(error.message);
    return json(res, 500, { error: 'Unexpected server error' });
  }
});

server.listen(PORT, () => console.log(`Nightleague running at http://localhost:${PORT}`));
