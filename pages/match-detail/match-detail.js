Page({
  data: {
    match: null,
    matches: [],
    playerCounts: {},
    byeCounts: {},
    activeTab: 'details', // 默认显示比赛详情tab
    playerStats: {} // 存储每个玩家的统计数据
  },

  onLoad: function(options) {
    const matchId = parseInt(options.id);
    this.loadMatchDetail(matchId);
  },

  // 加载比赛详情
  loadMatchDetail: function(matchId) {
    try {
      const matches = wx.getStorageSync('matches') || [];
      const match = matches.find(m => m.id === matchId);
      
      if (match) {
        console.log('加载的比赛数据:', match);
        console.log('rounds字段值:', match.rounds);
        console.log('selectedRounds字段值:', match.selectedRounds);
        
        // 检查数据完整性
        if (match.rounds === undefined || match.rounds === null) {
          console.error('比赛数据缺失rounds字段:', match);
          wx.showToast({
            title: '比赛数据不完整：缺少比赛局数',
            icon: 'none',
            duration: 3000
          });
          return;
        }
        
        // 为每个对阵添加completed状态
        const matchesWithStatus = (match.matches || []).map(m => ({
          ...m,
          completed: false
        }));
        
        // 初始化玩家统计数据
        const playerStats = this.initializePlayerStats(match.players || []);
        
        this.setData({
          match: match,
          matches: matchesWithStatus,
          playerCounts: match.playerCounts || {},
          byeCounts: match.byeCounts || {},
          playerStats: playerStats
        });
      } else {
        wx.showToast({
          title: '比赛不存在',
          icon: 'none'
        });
        wx.navigateBack();
      }
    } catch (e) {
      console.error('加载比赛详情失败:', e);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  // 初始化玩家统计数据
  initializePlayerStats: function(players) {
    const stats = {};
    players.forEach(player => {
      stats[player.name] = {
        name: player.name,
        wins: 0,
        scoreDiff: 0
      };
    });
    return stats;
  },

  // 切换tab
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'statistics') {
      // 切换到分数统计tab时，重新计算统计数据
      this.calculatePlayerStats();
    }
    this.setData({
      activeTab: tab
    });
  },

  // 分数输入
  onScoreInput: function(e) {
    const { matchId, team } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    // 更新对应队伍的分数
    const matches = this.data.matches.map(m => {
      if (m.id === matchId) {
        if (team === 'team1') {
          m.team1.score = value;
        } else if (team === 'team2') {
          m.team2.score = value;
        }
      }
      return m;
    });
    
    this.setData({
      matches: matches
    });
  },

  // 切换完成/修改状态
  toggleComplete: function(e) {
    const matchId = e.currentTarget.dataset.matchId;
    
    const matches = this.data.matches.map(m => {
      if (m.id === matchId) {
        m.completed = !m.completed;
      }
      return m;
    });
    
    this.setData({
      matches: matches
    });
    
    // 显示提示
    const match = matches.find(m => m.id === matchId);
    if (match.completed) {
      wx.showToast({
        title: '比赛已完成',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '已切换到修改模式',
        icon: 'success'
      });
    }
  },

  // 计算玩家统计数据
  calculatePlayerStats: function() {
    const { matches, playerStats } = this.data;
    const newPlayerStats = { ...playerStats };
    
    // 重置所有玩家的统计数据
    Object.keys(newPlayerStats).forEach(playerName => {
      newPlayerStats[playerName].wins = 0;
      newPlayerStats[playerName].scoreDiff = 0;
    });
    
    // 遍历所有已完成的比赛
    matches.forEach(match => {
      if (match.completed && match.team1.score && match.team2.score) {
        const score1 = parseInt(match.team1.score) || 0;
        const score2 = parseInt(match.team2.score) || 0;
        
        if (score1 > score2) {
          // 左侧队伍胜利，只有获胜队伍增加胜场
          this.updatePlayerStats(newPlayerStats, match.team1, score1 - score2, true);
          this.updatePlayerStats(newPlayerStats, match.team2, score2 - score1, false);
        } else if (score2 > score1) {
          // 右侧队伍胜利，只有获胜队伍增加胜场
          this.updatePlayerStats(newPlayerStats, match.team2, score2 - score1, true);
          this.updatePlayerStats(newPlayerStats, match.team1, score1 - score2, false);
        }
        // 如果分数相等，不记录胜场和分数差
      }
    });
    
    // 转换为数组并排序
    const sortedStats = this.sortPlayerStats(newPlayerStats);
    
    this.setData({
      playerStats: newPlayerStats,
      sortedPlayerStats: sortedStats
    });
  },

  // 更新玩家统计数据
  updatePlayerStats: function(playerStats, team, scoreDiff, isWinner) {
    if (team.player1 && team.player1.name) {
      if (playerStats[team.player1.name]) {
        // 只有获胜队伍才增加胜场
        if (isWinner) {
          playerStats[team.player1.name].wins += 1;
        }
        playerStats[team.player1.name].scoreDiff += scoreDiff;
      }
    }
    if (team.player2 && team.player2.name) {
      if (playerStats[team.player2.name]) {
        // 只有获胜队伍才增加胜场
        if (isWinner) {
          playerStats[team.player2.name].wins += 1;
        }
        playerStats[team.player2.name].scoreDiff += scoreDiff;
      }
    }
  },

  // 排序玩家统计数据
  sortPlayerStats: function(playerStats) {
    const statsArray = Object.values(playerStats);
    
    // 按照胜场从大到小，胜场相同时按分数从大到小排列
    statsArray.sort((a, b) => {
      if (a.wins !== b.wins) {
        return b.wins - a.wins; // 胜场从大到小
      } else {
        return b.scoreDiff - a.scoreDiff; // 分数从大到小
      }
    });
    
    return statsArray;
  },

  // 格式化日期
  formatDate: function(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 获取状态颜色
  getStatusColor: function(status) {
    const colorMap = {
      '报名中': '#3cc51f',
      '进行中': '#ff9500',
      '已结束': '#999999'
    };
    return colorMap[status] || '#999999';
  }
}); 