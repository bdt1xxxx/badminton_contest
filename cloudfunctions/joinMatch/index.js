let cloud;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (e) {
  cloud = null;
}
const crypto = require('crypto');

function hashInviteCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

exports.main = async (event) => {
  const payload = event || {};
  const { matchId, inviteCode, participantId } = payload;

  if (!matchId || !inviteCode || !participantId) {
    return { ok: false, code: 'INVALID_PARAMS', message: 'missing required fields' };
  }

  if (!cloud) {
    return { ok: true, mock: true, matchId, participantId };
  }

  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();

  const inviteRes = await db.collection('match_invites')
    .where({ matchId, codeHash: hashInviteCode(inviteCode), status: 'active' })
    .limit(1)
    .get();

  if (!inviteRes.data.length) {
    return { ok: false, code: 'INVALID_INVITE', message: 'invite code invalid' };
  }

  const memberRes = await db.collection('match_members')
    .where({ matchId, participantId })
    .limit(1)
    .get();

  if (!memberRes.data.length) {
    return { ok: false, code: 'INVALID_PARTICIPANT', message: 'participant not found' };
  }

  const member = memberRes.data[0];
  if (member.boundOpenId && member.boundOpenId !== OPENID) {
    return { ok: false, code: 'PARTICIPANT_OCCUPIED', message: 'participant already bound' };
  }

  const existingBindRes = await db.collection('match_members')
    .where({ matchId, boundOpenId: OPENID })
    .limit(1)
    .get();

  if (existingBindRes.data.length && existingBindRes.data[0].participantId !== participantId) {
    return { ok: false, code: 'OPENID_ALREADY_BOUND', message: 'openid already bound to another participant' };
  }

  await db.collection('match_members').doc(member._id).update({
    data: {
      boundOpenId: OPENID,
      bindAt: new Date().toISOString()
    }
  });

  return { ok: true, memberInfo: { matchId, participantId } };
};
