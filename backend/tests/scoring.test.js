const test = require('node:test');
const assert = require('node:assert/strict');
const football = require('../scoring/football');
const cricket = require('../scoring/cricket');

test('football goal increments only the selected team and is undoable', () => {
  const start = football.createFootballState({ teamA:{ name:'A', code:'A', score:0 }, teamB:{ name:'B', code:'B', score:0 } });
  const afterGoal = football.applyFootballEvent(start, { type:'GOAL', team:'teamA', player:'Ravi', minute:12 });
  assert.equal(afterGoal.teamA.score, 1); assert.equal(afterGoal.teamB.score, 0); assert.equal(afterGoal.events.length, 1);
  const restored = football.undoFootballEvent(afterGoal);
  assert.equal(restored.teamA.score, 0); assert.equal(restored.events.length, 0); assert.equal(restored.version, 2);
});

test('football standings award three for a win and one for a draw', () => {
  const rows = football.footballStandings([
    { sport:'football', status:'COMPLETED', teamA:{code:'A',name:'A',score:2}, teamB:{code:'B',name:'B',score:1} },
    { sport:'football', status:'COMPLETED', teamA:{code:'A',name:'A',score:1}, teamB:{code:'B',name:'B',score:1} }
  ]);
  assert.equal(rows.find((row) => row.teamCode === 'A').points, 4);
  assert.equal(rows.find((row) => row.teamCode === 'B').points, 1);
});

test('cricket wides and no-balls add runs without consuming a legal ball', () => {
  let innings = cricket.createInnings({ ballsPerOver:6 });
  innings = cricket.applyDelivery(innings, { extraType:'WIDE', extraRuns:1, runsOffBat:0, striker:'A', bowler:'B' });
  innings = cricket.applyDelivery(innings, { extraType:'NO_BALL', extraRuns:1, runsOffBat:4, striker:'A', bowler:'B' });
  assert.equal(innings.runs, 6); assert.equal(innings.legalBalls, 0); assert.equal(innings.extras.wides, 1); assert.equal(innings.extras.noBalls, 1);
  const restored = cricket.undoDelivery(innings);
  assert.equal(restored.runs, 1); assert.equal(restored.legalBalls, 0);
});

test('cricket overs use ball counts, not decimal arithmetic', () => {
  assert.equal(cricket.oversDisplay(19, 6), '3.1');
  assert.equal(cricket.oversDisplay(20, 6), '3.2');
  assert.equal(cricket.currentRunRate(87, 45, 6), 11.6);
  assert.equal(cricket.requiredRunRate(103, 87, 15, 6), 6.4);
});

test('cricket wicket requires a dismissed batter and undo restores wickets', () => {
  assert.throws(() => cricket.applyDelivery(cricket.createInnings(), { isWicket:true }), /dismissed batter/);
  const innings = cricket.applyDelivery(cricket.createInnings(), { isWicket:true, dismissedBatter:'A', runsOffBat:0 });
  assert.equal(innings.wickets, 1); assert.equal(innings.legalBalls, 1);
  assert.equal(cricket.undoDelivery(innings).wickets, 0);
});
