const {
  callCloudFunction,
  findMatchInLocal,
  getLocalMatches,
  normalizeMatchRecord,
  setLocalMatches,
  upsertLocalMatch
} = require('../../utils/cloud-match');

Page({
  data: {
    match: null,
    matchId: '',
    localId: null,
    currentOpenId: '',
    isEditable: false,
    offlineMessage: '',
    matches: [],
    roundGroups: [],
    completedRoundGroups: [],
    displayCourtCount: 1,
    playerCounts: {},
    byeCounts: {},
    activeTab: 'details', // 默认显示比赛详情tab
    playerStats: {}, // 存储每个玩家的统计数据
    sortedPlayerStats: [],
    matchSummary: {
      total: 0,
      completed: 0,
      incomplete: 0
    }
  },

  onLoad: async function(options) {
    const localId = options.id ? parseInt(options.id, 10) : null;
    const matchIdFromScene = options.scene ? decodeURIComponent(options.scene) : '';
    const matchId = options.matchId || matchIdFromScene || '';
    await this.loadMatchDetail({ localId, matchId });
  },

  onShow: async function() {
    const match = this.data.match;
    if (!match) {
      return;
    }
    await this.loadMatchDetail({
      localId: this.data.localId,
      matchId: this.data.matchId || match.matchId || ''
    });
  },

  buildMatchSummary: function(matches) {
    const completed = matches.filter(match => match.completed).length;
    return {
      total: matches.length,
      completed: completed,
      incomplete: matches.length - completed
    };
  },

  getDisplayCourtCount: function(match) {
    const courtCount = parseInt(match && match.courtCount, 10);
    // 历史数据可能没有 courtCount，项目默认场地数为 2
    return courtCount === 1 ? 1 : 2;
  },

  getMatchPlayers: function(match) {
    const players = [];
    if (match && match.team1 && match.team1.player1 && match.team1.player1.name) players.push(match.team1.player1.name);
    if (match && match.team1 && match.team1.player2 && match.team1.player2.name) players.push(match.team1.player2.name);
    if (match && match.team2 && match.team2.player1 && match.team2.player1.name) players.push(match.team2.player1.name);
    if (match && match.team2 && match.team2.player2 && match.team2.player2.name) players.push(match.team2.player2.name);
    return players;
  },

  enrichRoundConflict: function(roundMatches) {
    if (roundMatches.length <= 1) {
      return roundMatches.map(match => ({
        ...match,
        uiConflict: !!match.hasConflict
      }));
    }

    const playerSets = roundMatches.map(match => new Set(this.getMatchPlayers(match)));
    const conflictIndexes = {};

    for (let i = 0; i < playerSets.length; i++) {
      for (let j = i + 1; j < playerSets.length; j++) {
        const hasOverlap = [...playerSets[i]].some(name => playerSets[j].has(name));
        if (hasOverlap) {
          conflictIndexes[i] = true;
          conflictIndexes[j] = true;
        }
      }
    }

    return roundMatches.map((match, index) => ({
      ...match,
      uiConflict: !!conflictIndexes[index] || !!match.hasConflict
    }));
  },

  buildRoundGroups: function(matches, courtCount) {
    if (courtCount !== 2) {
      return {
        roundGroups: [],
        completedRoundGroups: []
      };
    }

    // 双场地轮次分组必须固定，不能被完成状态排序打散
    const orderedMatches = [...matches].sort((a, b) => a.id - b.id);
    const grouped = [];
    for (let i = 0; i < orderedMatches.length; i += 2) {
      const roundMatches = this.enrichRoundConflict(orderedMatches.slice(i, i + 2));
      grouped.push({
        roundNumber: Math.floor(i / 2) + 1,
        matches: roundMatches
      });
    }

    const roundGroups = [];
    const completedRoundGroups = [];

    grouped.forEach(group => {
      const incompleteMatches = group.matches.filter(match => !match.completed);
      const completedMatches = group.matches.filter(match => match.completed);

      if (incompleteMatches.length > 0) {
        roundGroups.push({
          roundNumber: group.roundNumber,
          hasConflict: group.matches.some(match => !!match.uiConflict),
          matches: incompleteMatches
        });
      }

      if (completedMatches.length > 0) {
        completedRoundGroups.push({
          roundNumber: group.roundNumber,
          hasConflict: group.matches.some(match => !!match.uiConflict),
          matches: completedMatches
        });
      }
    });

    return {
      roundGroups: roundGroups,
      completedRoundGroups: completedRoundGroups
    };
  },

  // 加载比赛详情
  loadMatchDetail: async function({ localId, matchId }) {
    let currentOpenId = '';
    let offlineMessage = '';

    try {
      const openIdRes = await callCloudFunction('getOpenId');
      currentOpenId = openIdRes.openId || '';
    } catch (error) {
      console.warn('获取openId失败，将进入只读模式:', error);
    }

    let localMatch = findMatchInLocal({ id: localId, matchId });
    let targetMatch = localMatch ? normalizeMatchRecord(localMatch) : null;

    if (matchId || (targetMatch && targetMatch.matchId)) {
      const cloudMatchId = matchId || targetMatch.matchId;
      try {
        const cloudRes = await callCloudFunction('getMatchById', { matchId: cloudMatchId });
        targetMatch = normalizeMatchRecord(cloudRes.match);
        if (!targetMatch.id) {
          targetMatch.id = localId || Date.now();
        }
        upsertLocalMatch(targetMatch);
      } catch (error) {
        console.warn('拉取云端比赛失败，回退本地缓存:', error);
        if (!targetMatch) {
          wx.showToast({
            title: '比赛不存在或已删除',
            icon: 'none'
          });
          wx.navigateBack();
          return;
        }
        offlineMessage = '当前离线，可能不是最新';
      }
    }

    if (!targetMatch) {
      wx.showToast({
        title: '比赛不存在',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    if (targetMatch.rounds === undefined || targetMatch.rounds === null) {
      wx.showToast({
        title: '比赛数据不完整：缺少比赛局数',
        icon: 'none',
        duration: 3000
      });
      return;
    }

    const matchesWithStatus = (targetMatch.matches || []).map((item) => ({
      ...item,
      completed: !!item.completed
    }));

    const displayCourtCount = this.getDisplayCourtCount(targetMatch);
    const sortedMatches = displayCourtCount === 2
      ? [...matchesWithStatus]
      : this.sortMatchesByCompletion(matchesWithStatus);
    const groupedRounds = this.buildRoundGroups(sortedMatches, displayCourtCount);
    const playerStats = this.initializePlayerStats(targetMatch.players || []);
    const isEditable = !!currentOpenId && currentOpenId === targetMatch.ownerOpenId;

    this.setData({
      match: targetMatch,
      matchId: targetMatch.matchId || '',
      localId: targetMatch.id || localId,
      currentOpenId,
      isEditable,
      offlineMessage,
      matches: sortedMatches,
      playerCounts: targetMatch.playerCounts || {},
      byeCounts: targetMatch.byeCounts || {},
      displayCourtCount,
      roundGroups: groupedRounds.roundGroups,
      completedRoundGroups: groupedRounds.completedRoundGroups,
      playerStats,
      matchSummary: this.buildMatchSummary(sortedMatches)
    });
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
    if (!this.data.isEditable) {
      return;
    }
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
    const groupedRounds = this.buildRoundGroups(matches, this.data.displayCourtCount);
    
    this.setData({
      matches: matches,
      roundGroups: groupedRounds.roundGroups,
      completedRoundGroups: groupedRounds.completedRoundGroups
    });
  },

  // 切换完成/修改状态
  toggleComplete: async function(e) {
    if (!this.data.isEditable) {
      return;
    }
    const matchId = e.currentTarget.dataset.matchId;
    console.log('点击完成按钮，比赛ID:', matchId);
    console.log('排序前的比赛数据:', this.data.matches);
    
    const matches = this.data.matches.map(m => {
      if (m.id === matchId) {
        m.completed = !m.completed;
        console.log(`比赛 ${m.id} 状态变更为:`, m.completed);
      }
      return m;
    });
    
    // 双场地保持原始轮次顺序；单场地沿用完成状态排序
    const sortedMatches = this.data.displayCourtCount === 2
      ? [...matches]
      : this.sortMatchesByCompletion(matches);
    const groupedRounds = this.buildRoundGroups(sortedMatches, this.data.displayCourtCount);
    console.log('排序后的比赛数据:', sortedMatches);
    
    this.setData({
      matches: sortedMatches,
      roundGroups: groupedRounds.roundGroups,
      completedRoundGroups: groupedRounds.completedRoundGroups,
      matchSummary: this.buildMatchSummary(sortedMatches)
    }, () => {
      console.log('页面数据更新完成，当前matches:', this.data.matches);
      
      // 强制刷新页面数据
      this.forceUpdateMatches();
    });
    
    // 保存数据到本地存储并同步云端
    await this.saveMatchData(sortedMatches);
    
    // 显示提示
    const match = sortedMatches.find(m => m.id === matchId);
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

  // 根据完成状态重新排序对阵
  sortMatchesByCompletion: function(matches) {
    console.log('开始排序，输入数据:', matches);
    
    // 将比赛分为未完成和已完成两组
    const incompleteMatches = matches.filter(m => !m.completed);
    const completedMatches = matches.filter(m => m.completed);
    
    console.log('未完成的比赛:', incompleteMatches);
    console.log('已完成的比赛:', completedMatches);
    
    // 保持未完成比赛的相对顺序，已完成的比赛按原有顺序放在最后面
    // 这样既保持了未完成比赛的顺序，又保持了已完成比赛的完成先后顺序
    const result = [...incompleteMatches, ...completedMatches];
    console.log('排序结果:', result);
    
    return result;
  },

  // 保存比赛数据到本地存储
  saveMatchData: async function(matches) {
    try {
      const allMatches = getLocalMatches();
      const currentMatch = this.data.match;
      
      // 更新当前比赛的对阵数据
      const updatedMatch = {
        ...currentMatch,
        matches: matches
      };
      delete updatedMatch.isEditable;
      
      // 找到并更新存储中的比赛
      const updatedMatches = allMatches.map(m => 
        (m.matchId && currentMatch.matchId && m.matchId === currentMatch.matchId) || m.id === currentMatch.id
          ? updatedMatch
          : m
      );
      
      setLocalMatches(updatedMatches);
      this.setData({
        match: updatedMatch
      });
      console.log('比赛数据已保存到本地存储');

      if (this.data.isEditable && updatedMatch.matchId) {
        try {
          const cloudRes = await callCloudFunction('updateMatch', { match: updatedMatch });
          const nextMatch = {
            ...updatedMatch,
            updatedAt: cloudRes.updatedAt || updatedMatch.updatedAt,
            version: typeof cloudRes.version === 'number' ? cloudRes.version : updatedMatch.version
          };
          upsertLocalMatch(nextMatch);
          this.setData({
            match: nextMatch
          });
        } catch (syncError) {
          console.warn('云端同步失败:', syncError);
          wx.showToast({
            title: '本地已更新，云端同步失败',
            icon: 'none'
          });
        }
      }
    } catch (e) {
      console.error('保存比赛数据失败:', e);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 强制刷新页面数据
  forceUpdateMatches: function() {
    // 使用setTimeout确保DOM更新完成后再强制刷新
    setTimeout(() => {
      const currentMatches = this.data.matches;
      console.log('强制刷新前的数据:', currentMatches);
      const groupedRounds = this.buildRoundGroups(currentMatches, this.data.displayCourtCount);
      
      // 重新设置数据以触发页面更新
      this.setData({
        matches: [...currentMatches],
        roundGroups: groupedRounds.roundGroups,
        completedRoundGroups: groupedRounds.completedRoundGroups
      }, () => {
        console.log('强制刷新完成，当前数据:', this.data.matches);
      });
    }, 100);
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
      '报名中': '#16a34a',
      '进行中': '#ff9500',
      '已结束': '#999999'
    };
    return colorMap[status] || '#999999';
  },

  generateShareQRCode: function() {
    const match = this.data.match;
    if (!match || !match.matchId) {
      wx.showToast({
        title: '当前比赛不支持分享',
        icon: 'none'
      });
      return;
    }

    const encodedName = encodeURIComponent(match.name || '');
    wx.navigateTo({
      url: `/pages/match-share-qrcode/match-share-qrcode?matchId=${match.matchId}&matchName=${encodedName}`
    });
  },

  onShareAppMessage: function() {
    const match = this.data.match || {};
    const query = match.matchId ? `?matchId=${match.matchId}` : `?id=${match.id}`;
    return {
      title: `${match.name || '羽毛球比赛'} 对局进展`,
      path: `/pages/match-detail/match-detail${query}`
    };
  }
}); 
