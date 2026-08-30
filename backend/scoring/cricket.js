function createInnings(input = {}) {
  return {
    runs: Number(input.runs || 0), wickets: Number(input.wickets || 0), legalBalls: Number(input.legalBalls || 0),
    ballsPerOver: Number(input.ballsPerOver || 6), extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, ...(input.extras || {}) },
    deliveries: Array.isArray(input.deliveries) ? [...input.deliveries] : [],
    batterStats: input.batterStats ? { ...input.batterStats } : {}, bowlerStats: input.bowlerStats ? { ...input.bowlerStats } : {},
  };
}

function isLegalDelivery(extraType) {
  return !['WIDE', 'NO_BALL'].includes(extraType);
}

function rotateStrike(striker, nonStriker) { return { striker: nonStriker, nonStriker: striker }; }

function applyDelivery(input, delivery) {
  const state = createInnings(input);
  const extraType = delivery.extraType || null;
  const extraRuns = Number(delivery.extraRuns || (extraType === 'WIDE' || extraType === 'NO_BALL' ? 1 : 0));
  const batRuns = Number(delivery.runsOffBat || 0);
  if (batRuns < 0 || extraRuns < 0) throw new Error('Runs cannot be negative');
  if (delivery.isWicket && !delivery.dismissedBatter) throw new Error('A wicket needs a dismissed batter');
  const legal = isLegalDelivery(extraType);
  const total = batRuns + extraRuns;
  state.runs += total;
  if (legal) state.legalBalls += 1;
  if (extraType === 'WIDE') state.extras.wides += extraRuns;
  if (extraType === 'NO_BALL') state.extras.noBalls += extraRuns;
  if (extraType === 'BYE') state.extras.byes += extraRuns;
  if (extraType === 'LEG_BYE') state.extras.legByes += extraRuns;
  if (extraType === 'PENALTY') state.extras.penalty += extraRuns;
  if (delivery.isWicket) state.wickets += 1;
  const next = { ...delivery, id: delivery.id || `cd-${Date.now()}`, totalRuns: total, isLegalDelivery: legal, sequence: state.deliveries.length + 1, createdAt: delivery.createdAt || new Date().toISOString() };
  state.deliveries.push(next);
  return state;
}

function undoDelivery(input) {
  const state = createInnings(input);
  const delivery = state.deliveries.pop();
  if (!delivery) return state;
  state.runs = Math.max(0, state.runs - Number(delivery.totalRuns || 0));
  if (delivery.isLegalDelivery) state.legalBalls = Math.max(0, state.legalBalls - 1);
  if (delivery.isWicket) state.wickets = Math.max(0, state.wickets - 1);
  const extraKey = { WIDE: 'wides', NO_BALL: 'noBalls', BYE: 'byes', LEG_BYE: 'legByes', PENALTY: 'penalty' }[delivery.extraType];
  if (extraKey) state.extras[extraKey] = Math.max(0, state.extras[extraKey] - Number(delivery.extraRuns || 0));
  return state;
}

function oversDisplay(legalBalls, ballsPerOver = 6) { return `${Math.floor(legalBalls / ballsPerOver)}.${legalBalls % ballsPerOver}`; }
function currentRunRate(runs, legalBalls, ballsPerOver = 6) { return legalBalls ? Number((runs / (legalBalls / ballsPerOver)).toFixed(2)) : 0; }
function requiredRunRate(target, runs, ballsRemaining, ballsPerOver = 6) { return ballsRemaining > 0 ? Number(((target - runs) / (ballsRemaining / ballsPerOver)).toFixed(2)) : 0; }

module.exports = { createInnings, isLegalDelivery, rotateStrike, applyDelivery, undoDelivery, oversDisplay, currentRunRate, requiredRunRate };
