const MATCH_STORAGE_KEY = 'matches';
let cloudInitialized = false;

function ensureCloudReady() {
  if (cloudInitialized) {
    return;
  }
  if (!wx.cloud) {
    throw new Error('当前基础库不支持云开发');
  }
  wx.cloud.init({
    traceUser: true
  });
  cloudInitialized = true;
}

function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    try {
      ensureCloudReady();
    } catch (error) {
      reject(error);
      return;
    }
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res && res.result ? res.result : {};
        if (result.ok === false) {
          reject(new Error(result.message || result.code || 'cloud function failed'));
          return;
        }
        resolve(result);
      },
      fail: reject
    });
  });
}

function getLocalMatches() {
  return wx.getStorageSync(MATCH_STORAGE_KEY) || [];
}

function setLocalMatches(matches) {
  wx.setStorageSync(MATCH_STORAGE_KEY, matches);
}

function findMatchInLocal({ id, matchId }) {
  const matches = getLocalMatches();
  return matches.find((item) => {
    if (matchId && item.matchId === matchId) {
      return true;
    }
    return id !== undefined && id !== null && item.id === id;
  }) || null;
}

function upsertLocalMatch(match) {
  const matches = getLocalMatches();
  const index = matches.findIndex((item) => {
    if (match.matchId && item.matchId) {
      return item.matchId === match.matchId;
    }
    return item.id === match.id;
  });

  if (index >= 0) {
    matches[index] = match;
  } else {
    matches.unshift(match);
  }

  setLocalMatches(matches);
  return matches;
}

function removeLocalMatch({ id, matchId }) {
  const matches = getLocalMatches();
  const filtered = matches.filter((item) => {
    if (matchId && item.matchId === matchId) {
      return false;
    }
    if (id !== undefined && id !== null && item.id === id) {
      return false;
    }
    return true;
  });
  setLocalMatches(filtered);
  return filtered;
}

function normalizeMatchRecord(match) {
  if (!match) {
    return match;
  }
  const normalized = {
    ...match,
    matchId: match.matchId || '',
    ownerOpenId: match.ownerOpenId || '',
    updatedAt: match.updatedAt || null,
    version: typeof match.version === 'number' ? match.version : null
  };
  delete normalized._id;
  delete normalized._openid;
  return normalized;
}

module.exports = {
  callCloudFunction,
  findMatchInLocal,
  getLocalMatches,
  normalizeMatchRecord,
  removeLocalMatch,
  setLocalMatches,
  upsertLocalMatch
};
