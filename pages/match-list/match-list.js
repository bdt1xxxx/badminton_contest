Page({
  data: {
    matches: [],
    summary: {
      total: 0,
      active: 0,
      generatedMatches: 0
    }
  },

  onLoad: function() {
    this.loadMatches();
  },

  onShow: function() {
    this.loadMatches();
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

  // 加载比赛数据
  loadMatches: function() {
    try {
      console.log('开始加载比赛数据...');
      let matches = wx.getStorageSync('matches') || [];
      
      console.log('原始比赛数据:', matches);
      
      // 按创建时间从新到旧排序（从上到下，最新的在最上面）
      matches.sort((a, b) => {
        const timeA = new Date(a.createTime || a.id).getTime();
        const timeB = new Date(b.createTime || b.id).getTime();
        console.log(`比较: ${a.name}(${timeA}) vs ${b.name}(${timeB})`);
        return timeB - timeA; // 从新到旧（从上到下）
      });
      
      console.log('排序后的比赛数据:', matches);
      console.log('比赛数量:', matches.length);
      
      // 检查每个比赛的createTime字段
      matches.forEach((match, index) => {
        console.log(`比赛${index + 1}: ${match.name}, createTime: ${match.createTime}, id: ${match.id}`);
        console.log(`createTime类型: ${typeof match.createTime}`);
        if (match.createTime) {
          console.log(`解析后的时间: ${new Date(match.createTime)}`);
        }
      });
      
      this.setData({
        matches: matches,
        summary: this.buildSummary(matches)
      });
      
      console.log('页面数据更新完成，当前matches:', this.data.matches);
    } catch (e) {
      console.error('加载比赛数据失败:', e);
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
