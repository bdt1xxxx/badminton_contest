const { callCloud } = require('../../utils/cloud-api');

function normalizeJoinPayload(matchId, inviteCode, participantId) {
  return {
    matchId: String(matchId || '').trim(),
    inviteCode: String(inviteCode || '').trim(),
    participantId: String(participantId || '').trim()
  };
}

const pageDefinition = {
  data: {
    matchId: '',
    inviteCode: '',
    participantId: ''
  },

  onLoad(options) {
    this.setData({
      matchId: options && options.matchId ? options.matchId : ''
    });
  },

  onMatchIdInput(e) {
    this.setData({ matchId: e.detail.value });
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value });
  },

  onParticipantIdInput(e) {
    this.setData({ participantId: e.detail.value });
  },

  async onSubmit() {
    const payload = normalizeJoinPayload(this.data.matchId, this.data.inviteCode, this.data.participantId);
    if (!payload.matchId || !payload.inviteCode || !payload.participantId) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    try {
      const res = await callCloud('joinMatch', payload);
      if (res && res.result && res.result.ok) {
        wx.showToast({ title: '绑定成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 600);
        return;
      }
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: error.message || '绑定失败', icon: 'none' });
    }
  }
};

if (typeof Page === 'function') {
  Page(pageDefinition);
}

module.exports = {
  normalizeJoinPayload
};
