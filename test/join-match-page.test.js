const assert = require('assert');
const { normalizeJoinPayload } = require('../pages/join-match/join-match');

const data = normalizeJoinPayload('m1', ' 123456 ', 'p2');
assert.deepStrictEqual(data, {
  matchId: 'm1',
  inviteCode: '123456',
  participantId: 'p2'
});
console.log('join-match-page ok');
