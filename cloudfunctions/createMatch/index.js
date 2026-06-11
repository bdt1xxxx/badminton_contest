let cloud;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (e) {
  cloud = null;
}
const crypto = require('crypto');

function nowIso() {
  return new Date().toISOString();
}

function hashInviteCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

exports.main = async (event) => {
  const payload = event || {};
  const timestamp = nowIso();

  if (!cloud) {
    return {
      ok: false,
      code: 'SERVER_INIT_FAILED',
      message: 'wx-server-sdk init failed'
    };
  }

  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();

  const matchDoc = {
    name: payload.name,
    type: payload.type,
    players: payload.players || [],
    rounds: payload.rounds,
    matches: payload.matches || [],
    status: payload.status || '报名中',
    creatorOpenId: OPENID,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const matchRes = await db.collection('matches').add({ data: matchDoc });
  const matchId = matchRes._id;

  const members = (payload.players || []).map((player) => ({
    matchId,
    participantId: player.id || player.name,
    participantName: player.name,
    boundOpenId: player.openid || '',
    role: (player.openid && player.openid === OPENID) ? 'creator' : 'player',
    bindAt: player.openid ? timestamp : ''
  }));

  const creatorMemberId = `creator_${OPENID}`;
  if (!members.find((item) => item.participantId === creatorMemberId)) {
    members.unshift({
      matchId,
      participantId: creatorMemberId,
      participantName: '创建者',
      boundOpenId: OPENID,
      role: 'creator',
      bindAt: timestamp
    });
  }

  if (members.length > 0) {
    await db.collection('match_members').add({ data: members[0] });
    if (members.length > 1) {
      await Promise.all(members.slice(1).map((member) => db.collection('match_members').add({ data: member })));
    }
  }

  const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
  await db.collection('match_invites').add({
    data: {
      matchId,
      codeHash: hashInviteCode(inviteCode),
      status: 'active',
      expireAt: '',
      maxUses: 9999,
      usedCount: 0,
      createdAt: timestamp
    }
  });

  return { ok: true, matchId, inviteCode };
};
