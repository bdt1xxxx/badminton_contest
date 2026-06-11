let cloud;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (e) {
  cloud = null;
}

exports.main = async (event) => {
  const payload = event || {};
  const { matchId } = payload;

  if (!matchId) {
    return { ok: false, code: 'INVALID_PARAMS', message: 'matchId is required' };
  }

  if (!cloud) {
    return { ok: true, mock: true, match: null };
  }

  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();

  const memberRes = await db.collection('match_members')
    .where({ matchId, boundOpenId: OPENID })
    .limit(1)
    .get();

  if (!memberRes.data.length) {
    return { ok: false, code: 'NO_ACCESS', message: 'no permission to view this match' };
  }

  const matchRes = await db.collection('matches').doc(matchId).get();
  return { ok: true, match: matchRes.data || null };
};
