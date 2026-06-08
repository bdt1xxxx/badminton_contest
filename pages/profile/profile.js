Page({
  data: {
    userInfo: {
      nickname: '匿名',
      avatar: '/images/profile.png'
    },
    hasUserInfo: false,
    dataSummary: {
      matchCount: 0,
      generatedMatches: 0,
      playerCount: 0
    }
  },

  loadDataSummary: function() {
    const matches = wx.getStorageSync('matches') || [];
    const playerNames = {};

    matches.forEach(match => {
      (match.players || []).forEach(player => {
        if (player && player.name) {
          playerNames[player.name] = true;
        }
      });
    });

    this.setData({
      dataSummary: {
        matchCount: matches.length,
        generatedMatches: matches.reduce((total, match) => {
          return total + ((match.matches && match.matches.length) || 0);
        }, 0),
        playerCount: Object.keys(playerNames).length
      }
    });
  },

  onLoad: function() {
    this.getUserProfile();
    this.loadDataSummary();
  },

  onShow: function() {
    this.getUserProfile();
    this.loadDataSummary();
  },

  // 获取用户信息
  getUserProfile: function() {
    // 检查是否已经授权
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，获取用户信息
          this.getUserInfo();
        } else {
          // 未授权，显示获取用户信息按钮
          this.setData({
            userInfo: {
              nickname: '匿名',
              avatar: '/images/profile.png'
            },
            hasUserInfo: false
          });
        }
      }
    });
  },

  // 获取用户信息
  getUserInfo: function() {
    wx.getUserInfo({
      success: (res) => {
        const userInfo = {
          nickname: res.userInfo.nickName || '匿名',
          avatar: res.userInfo.avatarUrl || '/images/profile.png'
        };
        
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
        
        // 保存到本地存储
        try {
          wx.setStorageSync('userInfo', userInfo);
        } catch (e) {
          console.error('保存用户信息失败:', e);
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        // 获取失败时使用默认值
        this.setData({
          userInfo: {
            nickname: '匿名',
            avatar: '/images/profile.png'
          },
          hasUserInfo: false
        });
      }
    });
  },

  // 导入数据
  importData: function() {
    // 直接显示导入对话框
    this.showImportDialog();
  },

  // 显示导入对话框
  showImportDialog: function() {
    wx.showModal({
      title: '导入数据',
      content: '',
      editable: true,
      placeholderText: '请粘贴比赛数据',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          this.processImportData(res.content.trim());
        }
      }
    });
  },

  // 显示数据格式示例
  showDataFormatExample: function() {
    const exampleData = [
      {
        "id": 1703123456789,
        "name": "示例比赛",
        "date": "2023-12-20",
        "time": "14:00",
        "location": "羽毛球馆",
        "type": "双打",
        "maxPlayers": 8,
        "players": [
          {"name": "张三", "score": 3.5},
          {"name": "李四", "score": 4.0},
          {"name": "王五", "score": 3.0},
          {"name": "赵六", "score": 4.5}
        ],
        "levelGap": 2,
        "rounds": 4,
        "status": "报名中",
        "createTime": "2023-12-20T10:00:00.000Z",
        "matches": [],
        "playerCounts": {},
        "byeCounts": {}
      }
    ];
    
    const exampleText = JSON.stringify(exampleData, null, 2);
    
    wx.showModal({
      title: '数据格式示例',
      content: '以下是正确的数据格式，您可以复制后修改使用：',
      showCancel: true,
      cancelText: '关闭',
      confirmText: '复制示例',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: exampleText,
            success: () => {
              wx.showToast({
                title: '示例数据已复制到剪贴板',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  // 处理导入的数据
  processImportData: function(dataStr) {
    try {
      let data;
      
      // 直接解析JSON数据
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        console.error('解析JSON失败:', e);
        wx.showToast({
          title: '数据格式错误，请检查JSON格式',
          icon: 'none'
        });
        return;
      }
      
      // 验证数据格式
      if (Array.isArray(data)) {
        // 验证每个比赛对象的结构
        const validMatches = [];
        const invalidMatches = [];
        
        data.forEach((match, index) => {
          if (this.validateMatchData(match)) {
            // 为导入的数据添加导入时间戳
            match.importTime = new Date().toISOString();
            validMatches.push(match);
          } else {
            invalidMatches.push({ index, match });
          }
        });
        
        if (validMatches.length === 0) {
          wx.showToast({
            title: '没有有效的数据',
            icon: 'none'
          });
          return;
        }
        
        // 获取现有的比赛数据
        const existingMatches = wx.getStorageSync('matches') || [];
        
        // 合并新数据到现有数据中
        const allMatches = [...existingMatches, ...validMatches];
        
        // 保存到本地存储
        wx.setStorageSync('matches', allMatches);
        
        // 显示导入结果
        wx.showToast({
          title: `导入成功，共${validMatches.length}条记录`,
          icon: 'success',
          duration: 2000
        });
        
        // 延迟跳转到比赛列表页面
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/match-list/match-list'
          });
        }, 1000);
      } else {
        wx.showToast({
          title: '数据格式错误：应为数组格式',
          icon: 'none'
        });
      }
    } catch (e) {
      console.error('处理导入数据失败:', e);
      wx.showToast({
        title: '数据格式错误或解码失败',
        icon: 'none'
      });
    }
  },

  // 验证比赛数据格式
  validateMatchData: function(match) {
    // 检查必需的字段
    const requiredFields = ['id', 'name', 'date', 'type', 'players', 'status'];
    
    for (const field of requiredFields) {
      if (!match.hasOwnProperty(field)) {
        console.warn(`比赛数据缺少必需字段: ${field}`, match);
        return false;
      }
    }
    
    // 检查字段类型
    if (typeof match.name !== 'string' || !match.name.trim()) {
      console.warn('比赛名称无效:', match.name);
      return false;
    }
    
    if (!Array.isArray(match.players) || match.players.length === 0) {
      console.warn('参赛选手数据无效:', match.players);
      return false;
    }
    
    if (typeof match.status !== 'string' || !['报名中', '进行中', '已结束'].includes(match.status)) {
      console.warn('比赛状态无效:', match.status);
      return false;
    }
    
    return true;
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
            this.loadDataSummary();
            
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
      
      if (matches.length === 0) {
        wx.showToast({
          title: '暂无数据可导出',
          icon: 'none'
        });
        return;
      }
      
      // 直接导出原始JSON数据
      this.exportRawData(matches);
    } catch (e) {
      console.error('导出失败:', e);
      wx.showToast({
        title: '导出失败，请重试',
        icon: 'none'
      });
    }
  },

  // 导出原始数据
  exportRawData: function(matches) {
    try {
      // 先格式化为标准JSON，然后删除所有换行符和多余空格
      const jsonData = JSON.stringify(matches, null, 2)
        .replace(/\n/g, '')           // 删除所有换行符
        .replace(/\r/g, '')           // 删除所有回车符
        .replace(/\t/g, '')           // 删除所有制表符
        .replace(/[ ]{2,}/g, ' ')     // 将多个连续空格替换为单个空格
        .replace(/\[ /g, '[')         // 删除数组开头的空格
        .replace(/ \]/g, ']')         // 删除数组结尾的空格
        .replace(/\{ /g, '{')         // 删除对象开头的空格
        .replace(/ \}/g, '}')         // 删除对象结尾的空格
        .replace(/ : /g, ':')         // 删除冒号前后的空格
        .replace(/, /g, ',')          // 删除逗号后的空格
        .replace(/ ,/g, ',');         // 删除逗号前的空格
      
      // 复制到剪贴板
      wx.setClipboardData({
        data: jsonData,
        success: () => {
          wx.showToast({
            title: '导出成功',
            icon: 'success',
            duration: 1000
          });
        },
        fail: (err) => {
          console.error('复制到剪贴板失败:', err);
          wx.showToast({
            title: '导出失败',
            icon: 'none',
            duration: 1000
          });
        }
      });
    } catch (e) {
      console.error('导出原始数据失败:', e);
      wx.showToast({
        title: '导出失败，请重试',
        icon: 'none'
      });
    }
  }
}); 
