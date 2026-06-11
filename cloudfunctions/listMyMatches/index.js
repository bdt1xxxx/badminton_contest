let cloud;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (e) {
  cloud = null;
}

exports.main = async () => {
  if (!cloud) {
    return { ok: false, code: 'SERVER_INIT_FAILED', message: 'wx-server-sdk init failed', matches: [] };
  }

  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();

  const memberRes = await db.collection('match_members')
    .where({ boundOpenId: OPENID })
    .get();

  const matchIds = memberRes.data.map((item) => item.matchId).filter(Boolean);
  if (!matchIds.length) {
    return { ok: true, matches: [] };
  }

  const _ = db.command;
  const matchesRes = await db.collection('matches')
    .where({ _id: _.in(matchIds) })
    .get();

  return {
    ok: true,
    matches: matchesRes.data.map((m) => ({
      id: m._id,
      name: m.name,
      type: m.type,
      status: m.status,
      players: m.players || [],
      maxPlayers: m.maxPlayers || (Array.isArray(m.players) ? m.players.length : 0),
      rounds: m.rounds || 0,
      matches: m.matches || [],
      updatedAt: m.updatedAt,
      createTime: m.createdAt
    }))
  };
};
