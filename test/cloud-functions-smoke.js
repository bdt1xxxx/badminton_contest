const assert = require('assert');

function hasMain(fn) {
  return typeof fn.main === 'function';
}

const createMatch = require('../cloudfunctions/createMatch/index');
const joinMatch = require('../cloudfunctions/joinMatch/index');
const listMyMatches = require('../cloudfunctions/listMyMatches/index');
const getMatchDetail = require('../cloudfunctions/getMatchDetail/index');
const updateScore = require('../cloudfunctions/updateScore/index');

assert.ok(hasMain(createMatch));
assert.ok(hasMain(joinMatch));
assert.ok(hasMain(listMyMatches));
assert.ok(hasMain(getMatchDetail));
assert.ok(hasMain(updateScore));
console.log('cloud-functions-smoke ok');
