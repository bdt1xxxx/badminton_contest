const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('matches');

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const callerOpenId = wxContext.OPENID || '';
  const matchId = event && event.matchId ? String(event.matchId) : '';

  if (!callerOpenId) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'missing openid' };
  }
  if (!matchId) {
    return { ok: false, code: 'INVALID_MATCH_ID', message: 'missing matchId' };
  }

  let existing;
  try {
    const res = await collection.doc(matchId).get();
    existing = res && res.data ? res.data : null;
  } catch (error) {
    if (error && error.errCode === -1) {
      return { ok: true, deleted: false, notFound: true };
    }
    throw error;
  }

  if (!existing) {
    return { ok: true, deleted: false, notFound: true };
  }

  if (existing.ownerOpenId !== callerOpenId) {
    return { ok: false, code: 'FORBIDDEN', message: 'only owner can delete match' };
  }

  await collection.doc(matchId).remove();
  return { ok: true, deleted: true };
};
