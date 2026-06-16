const { callCloudFunction } = require('../../utils/cloud-match');

Page({
  data: {
    matchId: '',
    matchName: '',
    qrImageSrc: '',
    sharePath: '',
    fallbackMode: false,
    fallbackMessage: '',
    loading: true,
    errorMessage: ''
  },

  getCurrentEnvVersion: function() {
    try {
      const accountInfo = wx.getAccountInfoSync && wx.getAccountInfoSync();
      const envVersion = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion;
      if (envVersion === 'release' || envVersion === 'trial' || envVersion === 'develop') {
        return envVersion;
      }
    } catch (error) {
      console.warn('读取小程序环境失败，默认使用 trial:', error);
    }
    return 'trial';
  },

  onLoad: async function(options) {
    const matchId = options.matchId || '';
    const matchName = options.matchName ? decodeURIComponent(options.matchName) : '';

    this.setData({
      matchId,
      matchName
    });

    if (!matchId) {
      this.setData({
        loading: false,
        errorMessage: '缺少比赛ID，无法生成二维码'
      });
      return;
    }

    await this.loadQrCode();
  },

  loadQrCode: async function() {
    this.setData({
      loading: true,
      errorMessage: '',
      fallbackMode: false,
      fallbackMessage: ''
    });

    try {
      const envVersion = this.getCurrentEnvVersion();
      const res = await callCloudFunction('getMatchQrCode', {
        matchId: this.data.matchId,
        envVersion
      });

      if (res.mode === 'fallback') {
        console.warn('二维码降级到手动分享模式:', res.debug || {});
        this.setData({
          sharePath: res.sharePath || '',
          loading: false,
          fallbackMode: true,
          fallbackMessage: res.message || '二维码权限未开通，请手动分享比赛ID'
        });
        return;
      }

      this.setData({
        qrImageSrc: `data:image/png;base64,${res.imageBase64}`,
        sharePath: res.sharePath || '',
        loading: false,
        fallbackMode: false,
        errorMessage: ''
      });
    } catch (error) {
      console.error('加载二维码失败:', error);
      this.setData({
        loading: false,
        errorMessage: error.message || '二维码生成失败，请重试'
      });
    }
  },

  onRetryTap: async function() {
    await this.loadQrCode();
  },

  onCopyMatchIdTap: function() {
    wx.setClipboardData({
      data: this.data.matchId,
      success: () => {
        wx.showToast({
          title: '比赛ID已复制',
          icon: 'none'
        });
      }
    });
  },

  onCopyPathTap: function() {
    wx.setClipboardData({
      data: this.data.sharePath || '',
      success: () => {
        wx.showToast({
          title: '分享路径已复制',
          icon: 'none'
        });
      }
    });
  },

  onBackTap: function() {
    wx.navigateBack();
  }
});
