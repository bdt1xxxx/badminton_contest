const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('matches');

exports.main = async (event) => {
  const matchId = event && event.matchId ? String(event.matchId) : '';
  if (!matchId) {
    return { ok: false, code: 'INVALID_MATCH_ID', message: 'missing matchId' };
  }

  try {
    const res = await collection.doc(matchId).get();
    if (!res || !res.data) {
      return { ok: false, code: 'NOT_FOUND', message: 'match not found' };
    }

    const match = { ...res.data };
    delete match._id;
    delete match._openid;
    delete match.isEditable;
    return { ok: true, match };
  } catch (error) {
    if (error && error.errCode === -1) {
      return { ok: false, code: 'NOT_FOUND', message: 'match not found' };
    }
    throw error;
  }
};
