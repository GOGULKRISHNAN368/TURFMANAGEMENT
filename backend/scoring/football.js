function createFootballState(input = {}) {
  return {
    status: input.status || 'SCHEDULED',
    minute: Number(input.minute || 0),
    teamA: { ...(input.teamA || { name: 'Home', code: 'HOME', score: 0 }) },
    teamB: { ...(input.teamB || { name: 'Away', code: 'AWAY', score: 0 }) },
    events: Array.isArray(input.events) ? [...input.events] : [],
    version: Number(input.version || 0),
  };
}

const allowedEvents = new Set(['GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'PERIOD_START', 'PERIOD_END']);

function applyFootballEvent(input, event) {
  const state = createFootballState(input);
  if (!allowedEvents.has(event.type)) throw new Error('Unsupported football event');
  if (!['teamA', 'teamB', undefined].includes(event.team)) throw new Error('Invalid football team');
  const nextEvent = { ...event, id: event.id || `fe-${Date.now()}`, createdAt: event.createdAt || new Date().toISOString() };
  if (nextEvent.type === 'GOAL') {
    if (!nextEvent.team) throw new Error('A goal needs a team');
    state[nextEvent.team].score += 1;
  }
  if (nextEvent.type === 'PERIOD_START') state.status = 'LIVE';
  if (nextEvent.type === 'PERIOD_END') state.status = 'COMPLETED';
  if (Number.isFinite(Number(nextEvent.minute))) state.minute = Math.max(state.minute, Number(nextEvent.minute));
  state.events.push(nextEvent);
  state.version += 1;
  return state;
}

function undoFootballEvent(input) {
  const state = createFootballState(input);
  const event = state.events.pop();
  if (!event) return state;
  if (event.type === 'GOAL' && state[event.team]) state[event.team].score = Math.max(0, state[event.team].score - 1);
  state.status = state.events.some((item) => item.type === 'PERIOD_END') ? 'COMPLETED' : state.status;
  state.version += 1;
  return state;
}

function footballStandings(matches) {
  const rows = new Map();
  for (const match of matches) {
    if (match.sport !== 'football' || !['COMPLETED', 'LIVE'].includes(match.status)) continue;
    for (const side of ['teamA', 'teamB']) {
      const team = match[side];
      if (!rows.has(team.code)) rows.set(team.code, { teamCode: team.code, team: team.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
    }
    if (match.status !== 'COMPLETED') continue;
    const a = rows.get(match.teamA.code); const b = rows.get(match.teamB.code);
    a.played += 1; b.played += 1; a.gf += match.teamA.score; a.ga += match.teamB.score; b.gf += match.teamB.score; b.ga += match.teamA.score;
    if (match.teamA.score > match.teamB.score) { a.won += 1; a.points += 3; b.lost += 1; }
    else if (match.teamA.score < match.teamB.score) { b.won += 1; b.points += 3; a.lost += 1; }
    else { a.drawn += 1; b.drawn += 1; a.points += 1; b.points += 1; }
  }
  return [...rows.values()].map((row) => ({ ...row, gd: row.gf - row.ga })).sort((a, b) => b.points - a.points || b.gd - a.gd);
}

module.exports = { createFootballState, applyFootballEvent, undoFootballEvent, footballStandings };
