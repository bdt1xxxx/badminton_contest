const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const collection = db.collection('matches');

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const callerOpenId = wxContext.OPENID || '';
  const matchId = event && event.matchId ? String(event.matchId) : '';
  const inputEnvVersion = event && event.envVersion ? String(event.envVersion) : '';
  const envVersion = ['release', 'trial', 'develop'].includes(inputEnvVersion)
    ? inputEnvVersion
    : 'trial';

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
      return { ok: false, code: 'NOT_FOUND', message: 'match not found' };
    }
    throw error;
  }

  if (!existing) {
    return { ok: false, code: 'NOT_FOUND', message: 'match not found' };
  }

  if (existing.ownerOpenId !== callerOpenId) {
    return { ok: false, code: 'FORBIDDEN', message: 'only owner can share match qrcode' };
  }

  const sharePath = `pages/match-detail/match-detail?matchId=${encodeURIComponent(matchId)}`;

  try {
    const qrRes = await cloud.openapi.wxacode.getUnlimited({
      scene: encodeURIComponent(matchId),
      page: 'pages/match-detail/match-detail',
      checkPath: false,
      envVersion
    });

    return {
      ok: true,
      mode: 'qrcode',
      imageBase64: qrRes.buffer.toString('base64'),
      matchId,
      sharePath,
      envVersion
    };
  } catch (error) {
    console.error('getMatchQrCode openapi error:', {
      errCode: error && (error.errCode || error.errorCode),
      errMsg: error && error.errMsg,
      message: error && error.message,
      stack: error && error.stack
    });
    // 云环境未开通小程序码权限时，降级返回可分享参数，前端继续可用。
    const errCode = error && (error.errCode || error.errorCode);
    const errMsg = error && error.errMsg ? String(error.errMsg) : '';
    const noPermission = errCode === -604101 || errMsg.includes('-604101');
    if (noPermission) {
      console.warn('getMatchQrCode fallback due to no openapi permission', {
        errCode,
        errMsg
      });
      return {
        ok: true,
        mode: 'fallback',
        matchId,
        sharePath,
        message: '当前环境未开通小程序码权限，已切换为手动分享模式',
        debug: {
          errCode,
          errMsg
        }
      };
    }
    throw error;
  }
};
