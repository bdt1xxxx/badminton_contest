Page({
  data: {
    userInfo: {
      nickname: '羽毛球爱好者',
      avatar: '/images/default-avatar.png'
    },
    statistics: {
      totalMatches: 0,
      participatedMatches: 0,
      wonMatches: 0,
      totalScore: 0
    },
    menuItems: [
      {
        id: 'match-history',
        title: '比赛记录',
        icon: '📊',
        desc: '查看历史比赛记录'
      },
      {
        id: 'score-calculator',
        title: '分数计算器',
        icon: '🧮',
        desc: '快速计算比赛分数'
      },
      {
        id: 'settings',
        title: '设置',
        icon: '⚙️',
        desc: '应用设置和偏好'
      },
      {
        id: 'about',
        title: '关于',
        icon: 'ℹ️',
        desc: '版本信息和帮助'
      }
    ]
  },

  onLoad: function() {
    this.loadUserData();
    this.calculateStatistics();
  },

  onShow: function() {
    this.calculateStatistics();
  },

  // 加载用户数据
  loadUserData: function() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({
          userInfo: userInfo
        });
      }
    } catch (e) {
      console.error('加载用户数据失败:', e);
    }
  },

  // 计算统计数据
  calculateStatistics: function() {
    try {
      const matches = wx.getStorageSync('matches') || [];
      const totalMatches = matches.length;
      const participatedMatches = matches.filter(match => match.status === '已结束').length;
      
      // 这里可以根据实际需求计算获胜次数和总分
      const wonMatches = Math.floor(participatedMatches * 0.6); // 示例数据
      const totalScore = participatedMatches * 21; // 示例数据
      
      this.setData({
        statistics: {
          totalMatches,
          participatedMatches,
          wonMatches,
          totalScore
        }
      });
    } catch (e) {
      console.error('计算统计数据失败:', e);
    }
  },

  // 编辑用户信息
  editProfile: function() {
    wx.showModal({
      title: '编辑昵称',
      content: '请输入新的昵称',
      editable: true,
      placeholderText: '请输入昵称',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const userInfo = this.data.userInfo;
          userInfo.nickname = res.content.trim();
          
          try {
            wx.setStorageSync('userInfo', userInfo);
            this.setData({
              userInfo: userInfo
            });
            
            wx.showToast({
              title: '昵称更新成功',
              icon: 'success'
            });
          } catch (e) {
            wx.showToast({
              title: '更新失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 菜单项点击
  onMenuItemClick: function(e) {
    const itemId = e.currentTarget.dataset.id;
    
    switch (itemId) {
      case 'match-history':
        wx.navigateTo({
          url: '/pages/match-history/match-history'
        });
        break;
      case 'score-calculator':
        wx.navigateTo({
          url: '/pages/score-calculator/score-calculator'
        });
        break;
      case 'settings':
        wx.navigateTo({
          url: '/pages/settings/settings'
        });
        break;
      case 'about':
        wx.navigateTo({
          url: '/pages/about/about'
        });
        break;
    }
  },

  // 清除数据
  clearData: function() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有比赛数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('matches');
            this.calculateStatistics();
            
            wx.showToast({
              title: '数据已清除',
              icon: 'success'
            });
          } catch (e) {
            wx.showToast({
              title: '清除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 导出数据
  exportData: function() {
    try {
      const matches = wx.getStorageSync('matches') || [];
      const dataStr = JSON.stringify(matches, null, 2);
      
      // 这里可以实现数据导出功能
      // 由于小程序限制，可以复制到剪贴板或显示在页面上
      wx.setClipboardData({
        data: dataStr,
        success: () => {
          wx.showToast({
            title: '数据已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    } catch (e) {
      wx.showToast({
        title: '导出失败，请重试',
        icon: 'none'
      });
    }
  }
}); 