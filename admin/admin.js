const adminState = { token: localStorage.getItem('nightleague-admin-token'), admin: null, registrations: [], teams: [], fixtures: [], matches: [], currentRegistration: null, currentMatch: null, selectedFootballEvent: 'GOAL', pendingCricket: { runsOffBat: 0, extraType: null, extraRuns: 0, isWicket: false } };
const $$ = (selector) => [...document.querySelectorAll(selector)];
const one = (selector) => document.querySelector(selector);

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(adminState.token ? { Authorization: `Bearer ${adminState.token}` } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data;
}

function notify(message, good = true) {
  const toast = one('#toast-admin'); toast.textContent = message; toast.style.background = good ? 'var(--ink)' : '#a84c39'; toast.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function dateLabel(value) { if (!value) return '—'; return new Date(value).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }).toUpperCase(); }
function timeLabel(value) { if (!value) return ''; return new Date(value).toLocaleTimeString('en-IN', { hour:'numeric', minute:'2-digit' }); }
function sportLabel(sport) { return sport === 'football' ? '⚽ FOOTBALL' : '🏏 CRICKET'; }
function statusClass(status) { return String(status).toLowerCase().replaceAll('_', '-'); }

function navigate(page) {
  $$('.page').forEach((item) => item.classList.toggle('active', item.id === `page-${page}`));
  $$('.nav-item[data-page]').forEach((item) => item.classList.toggle('active', item.dataset.page === page));
  one('#page-kicker').textContent = page.replaceAll('-', ' ').toUpperCase();
  one('.sidebar').classList.remove('open');
  if (page === 'registrations') loadRegistrations();
  if (page === 'teams') loadTeams();
  if (page === 'fixtures') loadFixtures();
  if (page === 'audit') loadAudit();
}

function renderDashboard(data) {
  const s = data.stats;
  one('#metric-pending').textContent = String(s.pendingRegistrations).padStart(2, '0'); one('#metric-teams').textContent = String(s.confirmedTeams).padStart(2, '0'); one('#metric-payments').textContent = String(s.pendingPayments).padStart(2, '0'); one('#metric-live').textContent = String(s.liveMatches).padStart(2, '0'); one('#nav-pending').textContent = String(s.pendingRegistrations).padStart(2, '0');
  one('#queue-list').innerHTML = data.recentRegistrations.filter((r) => r.registrationStatus !== 'APPROVED').slice(0, 3).map((r) => `<div class="queue-item"><span class="sport-avatar ${r.sport === 'cricket' ? 'cricket' : ''}">${r.sport === 'cricket' ? '🏏' : '⚽'}</span><div><strong>${r.team}</strong><small>${sportLabel(r.sport)} · ${r.captain}</small></div><div><span class="queue-amount">₹${Number(r.amount).toLocaleString('en-IN')}</span><span class="status-chip ${statusClass(r.paymentStatus)}">${r.paymentStatus === 'PENDING_VERIFICATION' ? 'VERIFY PAYMENT' : r.paymentStatus.replaceAll('_',' ')}</span></div></div>`).join('') || '<div class="empty-state">No registrations need attention.</div>';
  renderLivePreview(adminState.matches);
}

function renderLivePreview(matches) {
  const match = matches.find((item) => item.sport === 'football') || matches.find((item) => item.status === 'LIVE');
  if (!match) return one('#live-preview').innerHTML = '<div class="empty-state">No live matches.</div>';
  const a = match.sport === 'football' ? match.teamA : { name: match.battingTeam, score: `${match.score.runs}/${match.score.wickets}` };
  const b = match.sport === 'football' ? match.teamB : { name: match.bowlingTeam, score: '—' };
  one('#live-preview').innerHTML = `<div class="live-match-mini"><div class="live-mini-top"><span><i class="orange-dot"></i> ${match.sport.toUpperCase()} · LIVE</span><span>${match.sport === 'football' ? `${match.minute}'` : `INNINGS ${match.innings || 2}`}</span></div><div class="live-mini-score"><div class="mini-team"><strong>${a.name}</strong><small>${match.sport === 'football' ? match.teamA.code : 'BATTING'}</small></div><div class="mini-score">${a.score}<span>—</span>${b.score}</div><div class="mini-team away"><strong>${b.name}</strong><small>${match.sport === 'football' ? match.teamB.code : 'BOWLING'}</small></div></div></div>`;
}

function renderRegistrations(filter = 'all', search = '') {
  const query = search.toLowerCase();
  const rows = adminState.registrations.filter((r) => (filter === 'all' || r.sport === filter) && (!query || `${r.teamDetails.name} ${r.captainDetails.name} ${r.transactionId}`.toLowerCase().includes(query)));
  one('#table-result-count').textContent = `${String(rows.length).padStart(2,'0')} submissions`;
  one('#registration-table').innerHTML = rows.map((r) => `<tr><td>${r.teamDetails.name}<small>${sportLabel(r.sport)} · ${r.teamDetails.city}</small></td><td>${r.captainDetails.name}<small>${r.captainDetails.phone}</small></td><td>${dateLabel(r.googleResponseTimestamp)}<small>${timeLabel(r.googleResponseTimestamp)}</small></td><td>₹${Number(r.claimedAmount).toLocaleString('en-IN')}<small>Expected ₹${Number(r.expectedAmount).toLocaleString('en-IN')}</small></td><td><span class="status-chip ${statusClass(r.paymentStatus)}">${r.paymentStatus.replaceAll('_',' ')}</span></td><td>${(r.duplicateFlags || []).length ? `<span class="flags">⚠ ${(r.duplicateFlags || []).length} flag${r.duplicateFlags.length > 1 ? 's' : ''}</span>` : '<span style="color:#71a16c">✓ clean</span>'}</td><td><span class="status-chip ${statusClass(r.registrationStatus)}">${r.registrationStatus}</span></td><td><button class="row-action" data-review-id="${r.id}">Review ↗</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty-cell">No submissions match that search.</td></tr>';
  $$('[data-review-id]').forEach((button) => button.addEventListener('click', () => openReview(button.dataset.reviewId)));
}

function openReview(id) {
  const r = adminState.registrations.find((item) => item.id === id); if (!r) return; adminState.currentRegistration = r;
  one('#modal-team').textContent = r.teamDetails.name; one('#modal-sport').textContent = `${r.sport.toUpperCase()} · ${r.createdTeamId || 'PENDING ID'}`; one('#modal-captain').textContent = r.captainDetails.name; one('#modal-contact').textContent = `${r.captainDetails.phone} · ${r.captainDetails.email}`; one('#modal-submitted').textContent = `${dateLabel(r.googleResponseTimestamp)} · ${timeLabel(r.googleResponseTimestamp)}`; one('#modal-players').textContent = `${r.submittedPlayers.length} players · expected ₹${Number(r.expectedAmount).toLocaleString('en-IN')}`; one('#modal-utr').textContent = r.transactionId || 'MISSING'; one('#modal-amount').textContent = `₹${Number(r.claimedAmount).toLocaleString('en-IN')} via ${r.paymentApplication || '—'}`; one('#modal-payer').textContent = `Payer: ${r.paymentPayerName || r.captainDetails.name} · ${r.paymentPayerPhone || r.captainDetails.phone}`; one('#proof-link').href = r.paymentScreenshotUrl || '#'; one('#modal-flags').innerHTML = (r.duplicateFlags || []).map((flag) => `<span>⚠ ${flag.replaceAll('_',' ')}</span>`).join('') || '<span style="background:#e4f2dc;color:#56844e">✓ NO FLAGS</span>'; one('#modal-note').value = r.adminNotes || '';
  const chip = one('.modal-status-line .status-chip'); chip.textContent = r.paymentStatus.replaceAll('_',' '); chip.className = `status-chip ${statusClass(r.paymentStatus)}`;
  one('#review-modal').classList.add('open');
}

function closeModal() { one('#review-modal').classList.remove('open'); }

async function verifyAndApprove() {
  const r = adminState.currentRegistration; if (!r) return;
  if (!window.confirm(`I confirm I checked the organizer's actual bank or UPI account and found transaction ${r.transactionId} for ₹${r.expectedAmount}.`)) return;
  try { const result = await api(`/admin/registrations/${r.id}/verify-and-approve`, { method:'POST', body: JSON.stringify({ confirmed:true, receivedAmount:r.expectedAmount, transactionId:r.transactionId, note:one('#modal-note').value }) }); notify(`${result.team.teamCode} approved — now public.`); closeModal(); await loadDashboard(); await loadRegistrations(); } catch (error) { notify(error.message, false); }
}

async function markIssue() { const r = adminState.currentRegistration; if (!r) return; try { await api(`/admin/registrations/${r.id}/payment`, { method:'PATCH', body:JSON.stringify({ status:'AMOUNT_MISMATCH', note:one('#modal-note').value || 'Payment needs review.' }) }); notify('Payment marked for correction.'); closeModal(); await loadDashboard(); await loadRegistrations(); } catch(error) { notify(error.message,false); } }

async function syncSheets() { try { await api('/admin/registrations/sync/football', { method:'POST' }); notify('Google Sheet synced.'); } catch(error) { notify(error.message, false); } }

function renderTeams() { one('#admin-team-grid').innerHTML = adminState.teams.map((team) => `<article class="admin-team-card"><div class="team-card-top"><span>${sportLabel(team.sport)} · GROUP ${team.group || '—'}</span><span class="team-code">${team.teamCode}</span></div><h2>${team.name}</h2><p>${team.city} · captain ${team.captain || '—'}</p><div class="team-card-meta"><span>SQUAD <b>${team.players} PLAYERS</b></span><span>STATUS <b style="color:#5f9255">● PUBLIC</b></span></div></article>`).join(''); }
function renderFixtures() { one('#admin-fixture-list').innerHTML = adminState.fixtures.map((f) => `<div class="admin-fixture"><div class="admin-fixture-time">${f.time}<small>${f.date}</small></div><div class="admin-fixture-main"><small>${sportLabel(f.sport)} · ${f.round}</small><strong>${f.teamA}<em>vs</em>${f.teamB}</strong></div><div class="admin-fixture-venue">${f.venue}</div><span class="fixture-tag ${f.status === 'LIVE' ? 'live' : ''}">${f.status === 'LIVE' ? '● LIVE' : f.status}</span><button class="fixture-edit">···</button></div>`).join(''); }
function renderAudit(logs) { one('#audit-list').innerHTML = logs.map((log) => `<div class="audit-row"><span>${log.action.replaceAll('_',' ')}</span><div><strong>${log.detail}</strong><span style="display:block;margin-top:5px">${log.entity}</span></div><time>${dateLabel(log.at)} · ${timeLabel(log.at)}<br>${log.admin}</time></div>`).join('') || '<div class="empty-cell">No audit events yet.</div>'; }

async function loadDashboard() { try { const [dashboard, matches] = await Promise.all([api('/admin/dashboard'), api('/admin/matches')]); adminState.matches = matches.matches; renderDashboard(dashboard); } catch(error) { notify(error.message,false); } }
async function loadRegistrations() { try { const result = await api('/admin/registrations'); adminState.registrations = result.registrations; one('#all-count').textContent = String(result.total).padStart(2,'0'); one('#fb-count').textContent = String(result.registrations.filter((r) => r.sport === 'football').length).padStart(2,'0'); one('#cr-count').textContent = String(result.registrations.filter((r) => r.sport === 'cricket').length).padStart(2,'0'); renderRegistrations(one('[data-reg-sport].active')?.dataset.regSport || 'all', one('#registration-search').value); } catch(error) { notify(error.message,false); } }
async function loadTeams() { try { adminState.teams = (await api('/admin/teams')).teams; renderTeams(); } catch(error) { notify(error.message,false); } }
async function loadFixtures() { try { adminState.fixtures = (await api('/admin/fixtures')).fixtures; renderFixtures(); } catch(error) { notify(error.message,false); } }
async function loadAudit() { try { renderAudit((await api('/admin/audit-logs')).auditLogs); } catch(error) { notify(error.message,false); } }

async function updateFootballScore(match) { if (!match) return; one('#admin-score-a').textContent = match.teamA.score; one('#admin-score-b').textContent = match.teamB.score; one('#match-version').textContent = String(match.version).padStart(2,'0'); one('#live-score-a')?.textContent; one('#football-log').innerHTML = [...(match.events || [])].reverse().slice(0,4).map((e) => `<div><b>${e.minute || '—'}'</b><span class="event-dot ${e.team === 'teamB' ? 'away' : 'goal'}"></span><strong>${e.type.replaceAll('_',' ')}</strong><span>${e.player || ''} · ${e.team === 'teamB' ? match.teamB.name : match.teamA.name}</span></div>`).join(''); }
async function postFootball() { const matchId = one('#match-select').value; try { const result = await api(`/admin/football/matches/${matchId}/events`, { method:'POST', body:JSON.stringify({ type:adminState.selectedFootballEvent, team:one('#football-team').value, player:one('#football-player').value || 'Unassigned player', minute:Number(one('#football-minute').value || 0) }) }); adminState.currentMatch = result.match; await updateFootballScore(result.match); notify(`${adminState.selectedFootballEvent.replaceAll('_',' ')} added to the match.`); } catch(error) { notify(error.message,false); } }
async function undoFootball() { try { const result = await api(`/admin/football/matches/${one('#match-select').value}/events/last`, { method:'DELETE' }); await updateFootballScore(result.match); notify('Last football action reversed.'); } catch(error) { notify(error.message,false); } }
async function postCricket() { try { const result = await api(`/admin/cricket/matches/${one('#match-select').value}/deliveries`, { method:'POST', body:JSON.stringify({ runsOffBat:adminState.pendingCricket.runsOffBat, extraType:adminState.pendingCricket.extraType, extraRuns:adminState.pendingCricket.extraRuns, isWicket:adminState.pendingCricket.isWicket, dismissedBatter:adminState.pendingCricket.isWicket ? 'Rahul' : undefined, striker:'Rahul', nonStriker:'Arun', bowler:'Karthik' }) }); updateCricketCard(result.match); adminState.pendingCricket = { runsOffBat:0,extraType:null,extraRuns:0,isWicket:false }; notify('Delivery recorded and broadcast.'); } catch(error) { notify(error.message,false); } }
function updateCricketCard(match) { const score = match.score || {}; one('#admin-cricket-runs').textContent = `${score.runs}/${score.wickets}`; one('#admin-cricket-overs').textContent = `${match.overs || '0.0'} OVERS`; one('#runs-needed').textContent = Math.max(0, (match.target || 0) - score.runs); one('#delivery-strip').innerHTML = (match.recent || []).map((item) => `<span class="${item === '4' ? 'four' : item === '6' ? 'six' : item === 'W' ? 'wicket' : ''}">${item}</span>`).join(''); one('#match-version').textContent = String(match.version || 0).padStart(2,'0'); }
async function undoCricket() { try { const result = await api(`/admin/cricket/matches/${one('#match-select').value}/deliveries/last`, { method:'DELETE' }); updateCricketCard(result.match); notify('Last delivery reversed.'); } catch(error) { notify(error.message,false); } }

$$('.nav-item[data-page], [data-page].primary-button, [data-page].ghost-button').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
one('.sidebar-toggle').addEventListener('click', () => one('.sidebar').classList.toggle('open'));
one('[data-close-modal]').addEventListener('click', closeModal); one('#review-modal').addEventListener('click', (event) => { if (event.target.id === 'review-modal') closeModal(); }); one('#verify-approve').addEventListener('click', verifyAndApprove); one('#mark-issue').addEventListener('click', markIssue);
one('#modal-copy-utr').addEventListener('click', async () => { try { await navigator.clipboard.writeText(one('#modal-utr').textContent); notify('UTR copied.'); } catch { notify(one('#modal-utr').textContent); } });
one('#sync-sheets').addEventListener('click', syncSheets); one('#registration-search').addEventListener('input', (event) => renderRegistrations(one('[data-reg-sport].active')?.dataset.regSport || 'all', event.target.value));
one('#add-registration').addEventListener('click', async () => { const teamName = window.prompt('Team name'); if (!teamName) return; const captainName = window.prompt('Captain name'); if (!captainName) return; const phone = window.prompt('Captain phone'); if (!phone) return; try { await api('/admin/registrations/manual', { method:'POST', body:JSON.stringify({ sport:'football', teamName, captainName, phone }) }); notify(`${teamName} added to the review queue.`); await loadDashboard(); await loadRegistrations(); } catch(error) { notify(error.message,false); } });
$$('[data-reg-sport]').forEach((button) => button.addEventListener('click', () => { $$('[data-reg-sport]').forEach((b) => b.classList.remove('active')); button.classList.add('active'); renderRegistrations(button.dataset.regSport, one('#registration-search').value); }));
$$('[data-football-event]').forEach((button) => button.addEventListener('click', () => { adminState.selectedFootballEvent = button.dataset.footballEvent; $$('[data-football-event]').forEach((b) => b.classList.remove('goal-control')); button.classList.add('goal-control'); }));
one('#submit-football').addEventListener('click', postFootball); one('#undo-football').addEventListener('click', undoFootball); one('#submit-cricket').addEventListener('click', postCricket); one('#undo-cricket').addEventListener('click', undoCricket);
$$('[data-cricket-run]').forEach((button) => button.addEventListener('click', () => { adminState.pendingCricket = { runsOffBat:Number(button.dataset.cricketRun), extraType:null, extraRuns:0, isWicket:false }; $$('[data-cricket-run]').forEach((b) => b.classList.remove('selected')); button.classList.add('selected'); }));
$$('[data-cricket-extra]').forEach((button) => button.addEventListener('click', () => { adminState.pendingCricket = { runsOffBat:0, extraType:button.dataset.cricketExtra, extraRuns:button.dataset.cricketExtra === 'WIDE' || button.dataset.cricketExtra === 'NO_BALL' ? 1 : 1, isWicket:false }; $$('[data-cricket-extra]').forEach((b) => b.classList.remove('selected')); button.classList.add('selected'); }));
one('[data-cricket-wicket]').addEventListener('click', () => { adminState.pendingCricket = { runsOffBat:0, extraType:null, extraRuns:0, isWicket:true }; one('[data-cricket-wicket]').classList.toggle('selected'); });
$$('[data-score-sport]').forEach((button) => button.addEventListener('click', () => { $$('[data-score-sport]').forEach((b) => b.classList.remove('active')); button.classList.add('active'); const cricket = button.dataset.scoreSport === 'cricket'; one('#football-score-card').classList.toggle('hidden', cricket); one('#football-controls').classList.toggle('hidden', cricket); one('#cricket-score-card').classList.toggle('hidden', !cricket); one('#cricket-controls').classList.toggle('hidden', !cricket); one('#match-select').value = cricket ? 'match-cr-live' : 'match-fb-live'; }));
one('#generate-fixtures').addEventListener('click', async () => { try { const result = await api('/admin/fixtures/generate', { method:'POST', body:JSON.stringify({ sport:'football' }) }); adminState.fixtures = result.fixtures; renderFixtures(); notify(`${result.added} new fixtures generated.`); } catch(error) { notify(error.message,false); } });
one('#save-settings').addEventListener('click', async () => { try { await api('/admin/tournament', { method:'PATCH', body:JSON.stringify({ name:one('#setting-name').value, venue:one('#setting-venue').value, closingDate:one('#setting-closing').value, upiId:one('#setting-upi').value, footballFee:one('#setting-football-fee').value, cricketFee:one('#setting-cricket-fee').value, footballFormUrl:one('#setting-football-form').value, cricketFormUrl:one('#setting-cricket-form').value }) }); notify('Tournament settings saved.'); } catch(error) { notify(error.message,false); } });

async function boot() { try { const login = await api('/admin/auth/login', { method:'POST', body:JSON.stringify({ email:'admin@nightleague.in', password:'nightleague-demo' }) }); adminState.token = login.token; adminState.admin = login.admin; localStorage.setItem('nightleague-admin-token', adminState.token); const [dashboard, matches] = await Promise.all([api('/admin/dashboard'), api('/admin/matches')]); adminState.matches = matches.matches; renderDashboard(dashboard); updateFootballScore(adminState.matches.find((m) => m.id === 'match-fb-live')); updateCricketCard(adminState.matches.find((m) => m.id === 'match-cr-live')); } catch(error) { notify(error.message,false); } }
if ('EventSource' in window) { const stream = new EventSource('/api/public/live/stream'); stream.onmessage = (event) => { const payload = JSON.parse(event.data); if (payload.type === 'football-score') { renderLivePreview([payload.match]); updateFootballScore(payload.match); } if (payload.type === 'cricket-score') { renderLivePreview([payload.match]); updateCricketCard(payload.match); } }; }
boot();
