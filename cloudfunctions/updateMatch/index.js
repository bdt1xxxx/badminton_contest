const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('matches');

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const callerOpenId = wxContext.OPENID || '';
  const match = event && event.match ? event.match : null;
  const matchId = match && match.matchId ? String(match.matchId) : '';

  if (!callerOpenId) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'missing openid' };
  }
  if (!matchId || !match) {
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'missing match payload' };
  }

  let existing;
  try {
    const res = await collection.doc(matchId).get();
    existing = res && res.data ? res.data : null;
  } catch (error) {
    if (error && error.errCode === -1) {
      return { ok: false, code: 'NOT_FOUND', message: 'match not found' };
    }
    throw error;
  }

  if (!existing) {
    return { ok: false, code: 'NOT_FOUND', message: 'match not found' };
  }

  if (existing.ownerOpenId !== callerOpenId) {
    return { ok: false, code: 'FORBIDDEN', message: 'only owner can update match' };
  }

  const nextVersion = typeof existing.version === 'number' ? existing.version + 1 : 1;
  const now = Date.now();
  const updateDoc = {
    ...match,
    ownerOpenId: existing.ownerOpenId,
    updatedAt: now,
    version: nextVersion
  };
  delete updateDoc._id;
  delete updateDoc._openid;
  delete updateDoc.isEditable;

  await collection.doc(matchId).set({ data: updateDoc });

  return {
    ok: true,
    updatedAt: now,
    version: nextVersion
  };
};
