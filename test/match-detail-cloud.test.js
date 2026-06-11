const assert = require('assert');
const { buildUpdateScorePayload } = require('../pages/match-detail/match-detail');

const payload = buildUpdateScorePayload('m1', 0, 1, { team1: 21, team2: 18 }, 9);
assert.deepStrictEqual(payload, {
  matchId: 'm1',
  roundIndex: 0,
  matchIndex: 1,
  score: { team1: 21, team2: 18 },
  localMatchId: 9
});
console.log('match-detail-cloud ok');
