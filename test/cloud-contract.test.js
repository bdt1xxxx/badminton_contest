const assert = require('assert');
const { buildCallPayload } = require('../utils/cloud-api');

function testBuildCallPayload() {
  const payload = buildCallPayload('getMatchDetail', { matchId: 'm1' });
  assert.deepStrictEqual(payload, {
    name: 'getMatchDetail',
    data: { matchId: 'm1' }
  });
}

testBuildCallPayload();
console.log('cloud-contract ok');
