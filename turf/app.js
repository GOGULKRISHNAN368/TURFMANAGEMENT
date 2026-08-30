const state = { tournament: null, teams: [], fixtures: [], standings: {}, live: [] };

const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function renderTournament() {
  const t = state.tournament;
  if (!t) return;
  $('#football-fee').textContent = money(t.footballFee);
  $('#cricket-fee').textContent = money(t.cricketFee);
  $('#football-slots').textContent = t.footballRemaining;
  $('#cricket-slots').textContent = t.cricketRemaining;
  $('#upi-id').textContent = t.upiId; $('#upi-name').textContent = t.organizerName;
  $('#football-form-link').href = t.footballFormUrl; $('#cricket-form-link').href = t.cricketFormUrl;
  $('#team-count').textContent = String(t.footballConfirmed + t.cricketConfirmed).padStart(2, '0');
}

function renderTeams() {
  const grid = $('#team-grid');
  grid.innerHTML = state.teams.map((team) => `<article class="team-tile"><small>${team.sport === 'football' ? 'FOOTBALL' : 'CRICKET'} · GROUP ${team.group || '—'}</small><span class="tile-code">${team.teamCode}</span><h3>${team.name}</h3><span class="tile-shape"></span></article>`).join('');
}

function renderFixtures(filter = 'all') {
  const list = $('#fixture-list');
  const fixtures = state.fixtures.filter((fixture) => filter === 'all' || fixture.sport === filter);
  list.innerHTML = fixtures.map((fixture) => `<article class="fixture-item"><div class="date-block"><b>${fixture.time}</b><span>${fixture.date}</span></div><div><small>${fixture.sport.toUpperCase()} · ${fixture.round}</small><strong>${fixture.teamA} <em>vs</em> ${fixture.teamB}</strong></div><span class="venue">${fixture.venue}</span><span class="fixture-status ${fixture.status === 'LIVE' ? 'live' : ''}">${fixture.status === 'LIVE' ? '● LIVE' : fixture.status}</span></article>`).join('');
}

function renderStandings(sport = 'football') {
  const rows = state.standings[sport] || [];
  $('#standings-body').innerHTML = rows.map((row) => `<tr><td>${String(row.rank).padStart(2, '0')}</td><td>${row.team}</td><td>${row.played}</td><td>${row.won}</td><td>${row.lost}</td><td>${sport === 'football' ? (row.gd > 0 ? '+' : '') + row.gd : row.nrr}</td><td>${row.points}</td><td><span class="form-pips">${(row.form || []).map((form) => `<i class="${form === 'W' ? 'win' : form === 'L' ? 'loss' : ''}">${form}</i>`).join('')}</span></td></tr>`).join('');
}

function renderLive(matches) {
  const football = matches.find((match) => match.sport === 'football');
  if (!football) return;
  $('#hero-score-a').textContent = football.teamA.score;
  $('#hero-score-b').textContent = football.teamB.score;
  $('#live-score-a').textContent = football.teamA.score;
  $('#live-score-b').textContent = football.teamB.score;
}

async function load() {
  try {
    const [tournament, teams, fixtures, standings, live] = await Promise.all([
      getJson('/api/public/tournament'), getJson('/api/public/teams'), getJson('/api/public/fixtures'), getJson('/api/public/standings?sport=football'), getJson('/api/public/live')
    ]);
    state.tournament = tournament.tournament; state.teams = teams.teams; state.fixtures = fixtures.fixtures; state.standings.football = standings.standings; state.live = live.matches;
    const cricket = await getJson('/api/public/standings?sport=cricket'); state.standings.cricket = cricket.standings;
    renderTournament(); renderTeams(); renderFixtures(); renderStandings(); renderLive(state.live);
  } catch (error) {
    showToast('Live data is reconnecting…');
    console.warn(error);
  }
}

document.querySelectorAll('[data-fixture-sport]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-fixture-sport]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); renderFixtures(button.dataset.fixtureSport);
}));
document.querySelectorAll('[data-table-sport]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-table-sport]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); renderStandings(button.dataset.tableSport);
}));
$('#copy-upi').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#upi-id').textContent); showToast('UPI ID copied — ready to pay.'); } catch { showToast($('#upi-id').textContent); }
});
document.querySelector('.menu-toggle').addEventListener('click', () => document.querySelector('.desktop-nav').classList.toggle('mobile-open'));

if ('EventSource' in window) {
  const stream = new EventSource('/api/public/live/stream');
  stream.onmessage = (event) => { const payload = JSON.parse(event.data); if (payload.type === 'football-score') renderLive([payload.match]); };
  stream.onerror = () => stream.close();
}
load();
setInterval(async () => { try { const live = await getJson('/api/public/live'); state.live = live.matches; renderLive(state.live); } catch {} }, 10000);
