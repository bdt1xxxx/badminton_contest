const { callCloud } = require('../../utils/cloud-api');

Page({
  data: {
    matches: [],
    cloudEnabled: true,
    isRefreshing: false,
    summary: {
      total: 0,
      active: 0,
      generatedMatches: 0
    }
  },

  onLoad: function() {
    this.refreshMatches();
  },

  onShow: function() {
    this.refreshMatches();
  },

  buildSummary: function(matches) {
    return {
      total: matches.length,
      active: matches.filter(match => match.status !== '已结束').length,
      generatedMatches: matches.reduce((total, match) => {
        return total + ((match.matches && match.matches.length) || 0);
      }, 0)
    };
  },

  getLocalMatches: function() {
    const matches = wx.getStorageSync('matches') || [];
    matches.sort((a, b) => {
      const timeA = new Date(a.createTime || a.id).getTime();
      const timeB = new Date(b.createTime || b.id).getTime();
      return timeB - timeA;
    });
    return matches;
  },

  applyMatches: function(matches) {
    this.setData({
      matches: matches,
      summary: this.buildSummary(matches)
    });
  },

  loadMatches: function() {
    try {
      this.applyMatches(this.getLocalMatches());
    } catch (e) {
      console.error('加载比赛数据失败:', e);
    }
  },

  refreshMatches: async function() {
    if (this.data.isRefreshing) return;
    this.setData({ isRefreshing: true });
    try {
      const res = await callCloud('listMyMatches');
      if (res && res.result && res.result.ok && Array.isArray(res.result.matches)) {
        const cloudMatches = res.result.matches;
        const localMatches = this.getLocalMatches();
        if (cloudMatches.length === 0 && localMatches.length > 0) {
          this.applyMatches(localMatches);
          return;
        }
        this.applyMatches(cloudMatches);
        wx.setStorageSync('matches', cloudMatches);
        return;
      }
      this.loadMatches();
    } catch (error) {
      this.setData({ cloudEnabled: false });
      this.loadMatches();
    } finally {
      this.setData({ isRefreshing: false });
    }
  },

  // 查看比赛详情
  viewMatch: function(e) {
    const matchId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/match-detail/match-detail?id=${matchId}`
    });
  },

  // 删除比赛
  deleteMatch: function(e) {
    const matchId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这场比赛吗？删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          const matches = this.data.matches.filter(match => match.id !== matchId);
          
          try {
            wx.setStorageSync('matches', matches);
            this.setData({
              matches: matches,
              summary: this.buildSummary(matches)
            });
            
            wx.showToast({
              title: '比赛已删除',
              icon: 'success'
            });
          } catch (e) {
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  manualRefresh: function() {
    this.refreshMatches();
  },

  goJoinMatch: function() {
    wx.navigateTo({
      url: '/pages/join-match/join-match'
    });
  },

  // 格式化比赛创建时间：2026年5月27日 14:30
  formatMatchCreateTime: function(match) {
    if (!match) return '未知';

    let date;
    if (match.createTime) {
      date = new Date(match.createTime);
    } else if (match.date && match.time) {
      date = new Date(`${match.date}T${match.time}:00`);
    } else if (match.date) {
      date = new Date(match.date);
    } else {
      return '未知';
    }

    if (Number.isNaN(date.getTime())) {
      return '未知';
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  },

  // 获取状态颜色
  getStatusColor: function(status) {
    const colorMap = {
      '报名中': '#16a34a',
      '进行中': '#ff9500',
      '已结束': '#999999'
    };
    return colorMap[status] || '#999999';
  }
}); 
