let cloud;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (e) {
  cloud = null;
}

exports.main = async (event) => {
  const payload = event || {};
  const { matchId, roundIndex, matchIndex, localMatchId, score } = payload;

  if (!matchId || typeof roundIndex !== 'number' || typeof matchIndex !== 'number' || !score) {
    return { ok: false, code: 'INVALID_PARAMS', message: 'invalid score payload' };
  }

  if (!cloud) {
    return { ok: true, mock: true, updatedAt: new Date().toISOString() };
  }

  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();
  const matchRes = await db.collection('matches').doc(matchId).get();
  const match = matchRes.data;

  if (!match || match.creatorOpenId !== OPENID) {
    return { ok: false, code: 'NO_WRITE_ACCESS', message: 'only creator can update score' };
  }

  const allMatches = Array.isArray(match.matches) ? match.matches : [];
  const target = allMatches.find((item) => {
    if (localMatchId !== undefined && localMatchId !== null && String(item.id) === String(localMatchId)) {
      return true;
    }
    return item.roundIndex === roundIndex && item.matchIndex === matchIndex;
  });
  if (!target) {
    return { ok: false, code: 'MATCH_NOT_FOUND', message: 'target match not found' };
  }

  target.team1 = Object.assign({}, target.team1, { score: score.team1 });
  target.team2 = Object.assign({}, target.team2, { score: score.team2 });
  target.completed = true;

  const updatedAt = new Date().toISOString();
  await db.collection('matches').doc(matchId).update({
    data: {
      matches: allMatches,
      updatedAt
    }
  });

  return { ok: true, updatedAt };
};
