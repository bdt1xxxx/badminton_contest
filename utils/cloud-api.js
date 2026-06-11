function buildCallPayload(name, data) {
  return {
    name: name,
    data: data || {}
  };
}

function callCloud(name, data) {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
    return Promise.reject(new Error('wx.cloud.callFunction is not available'));
  }
  return wx.cloud.callFunction(buildCallPayload(name, data));
}

module.exports = {
  buildCallPayload: buildCallPayload,
  callCloud: callCloud
};
