const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('matches');
const _ = db.command;

function generateMatchId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `m_${ts}_${rand}`;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const ownerOpenId = wxContext.OPENID || '';
  if (!ownerOpenId) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'missing openid' };
  }

  const match = event && event.match ? event.match : null;
  if (!match || !Array.isArray(match.matches)) {
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'invalid match payload' };
  }

  const matchId = generateMatchId();
  const now = Date.now();
  const doc = {
    ...match,
    matchId,
    ownerOpenId,
    updatedAt: now,
    version: 1
  };

  delete doc.isEditable;

  await collection.doc(matchId).set({ data: doc });

  return {
    ok: true,
    matchId,
    ownerOpenId,
    updatedAt: now,
    version: 1
  };
};
