Page({
  data: {
    matchName: '',
    maxPlayers: 1,
    matchType: '单打',
    matchTypes: ['单打', '双打'],
    players: [],
    showConfirmDialog: false,
    levelGap: 0,
    levelGapIndex: 0,
    roundOptions: [],
    selectedRounds: 4
  },

  onLoad: function() {
    console.log('页面加载成功');
  },

  // 输入比赛名称
  onMatchNameInput: function(e) {
    console.log('输入比赛名称:', e.detail.value);
    this.setData({
      matchName: e.detail.value
    });
  },

  // 选择比赛类型
  onTypeChange: function(e) {
    console.log('选择比赛类型:', e.detail.value);
    const matchType = this.data.matchTypes[e.detail.value];
    this.setData({
      matchType: matchType
    });
  },

  // 设置最大参赛人数
  onMaxPlayersChange: function(e) {
    console.log('设置最大参赛人数:', e.detail.value);
    const newMaxPlayers = parseInt(e.detail.value) + 1;
    this.setData({
      maxPlayers: newMaxPlayers
    });
  },

  // 输入参赛选手姓名
  onPlayerInput: function(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    console.log('输入选手姓名:', index, value);
    
    // 简单的选手管理
    const players = this.data.players;
    if (value && value.trim()) {
      if (index >= players.length) {
        players.push({
          id: Date.now() + index,
          name: value.trim(),
          score: 1
        });
      } else {
        players[index].name = value.trim();
      }
    } else {
      if (index < players.length) {
        players.splice(index, 1);
      }
    }
    
    this.setData({
      players: players
    });
  },

  // 分数变化处理
  onScoreChange: function(e) {
    const index = e.currentTarget.dataset.index;
    const scoreIndex = e.detail.value;
    const scores = [1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10];
    const newScore = scores[scoreIndex];
    console.log('分数变化:', index, newScore);
    
    if (index < this.data.players.length) {
      const players = this.data.players;
      players[index].score = newScore;
      this.setData({
        players: players
      });
    }
  },

  // 显示确认对话框
  showConfirmDialog: function() {
    console.log('显示确认对话框');
    if (!this.data.matchName || !this.data.matchName.trim()) {
      wx.showToast({
        title: '请输入比赛名称',
        icon: 'none'
      });
      return;
    }

    if (this.data.players.length < 2) {
      wx.showToast({
        title: '至少需要2名参赛选手',
        icon: 'none'
      });
      return;
    }

    // 计算比赛局数选项
    const n = this.data.maxPlayers;
    const roundOptions = [
      { value: Math.round(4 * n / 4), checked: true, text: Math.round(4 * n / 4) + '局' },
      { value: Math.round(8 * n / 4), checked: false, text: Math.round(8 * n / 4) + '局' },
      { value: Math.round(12 * n / 4), checked: false, text: Math.round(12 * n / 4) + '局' }
    ];

    console.log('计算比赛局数选项:', roundOptions);

    this.setData({
      showConfirmDialog: true,
      roundOptions: roundOptions,
      selectedRounds: roundOptions[0].value
    });
  },

  // 隐藏确认对话框
  hideConfirmDialog: function() {
    this.setData({
      showConfirmDialog: false
    });
  },

  // 组间等级差距变化
  onLevelGapChange: function(e) {
    const index = e.detail.value;
    const levelGap = [0, 0.5, 1, 1.5, 2][index];
    console.log('组间等级差距变化:', levelGap);
    
    this.setData({
      levelGapIndex: index,
      levelGap: levelGap
    });
  },

  // 选择比赛局数
  onRoundSelect: function(e) {
    const index = e.currentTarget.dataset.index;
    console.log('选择比赛局数:', index);
    
    const currentRoundOptions = this.data.roundOptions;
    const newRoundOptions = currentRoundOptions.map((item, i) => ({
      ...item,
      checked: i === index
    }));
    
    const newSelectedRounds = newRoundOptions[index].value;
    
    this.setData({
      roundOptions: newRoundOptions,
      selectedRounds: newSelectedRounds
    });
  },

  // 创建比赛
  createMatch: function() {
    try {
      console.log('开始创建比赛...');
      console.log('比赛数据:', {
        name: this.data.matchName,
        type: this.data.matchType,
        maxPlayers: this.data.maxPlayers,
        players: this.data.players,
        levelGap: this.data.levelGap,
        selectedRounds: this.data.selectedRounds
      });

      // 生成对阵
      const generatedMatches = this.generateMatches();
      console.log('生成的对阵:', generatedMatches);

      // 创建比赛对象
      const match = {
        id: Date.now(),
        name: this.data.matchName,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toISOString().slice(11, 16),
        location: '待定',
        type: this.data.matchType,
        maxPlayers: this.data.maxPlayers,
        players: this.data.players,
        levelGap: this.data.levelGap,
        rounds: this.data.selectedRounds,
        status: '报名中',
        createTime: new Date().toISOString(),
        // 对阵信息
        matches: generatedMatches.matches,
        playerCounts: generatedMatches.playerCounts,
        byeCounts: generatedMatches.byeCounts
      };

      console.log('创建的比赛对象:', match);

      // 保存到本地存储
      let storedMatches = wx.getStorageSync('matches') || [];
      console.log('当前存储的比赛列表:', storedMatches);
      
      storedMatches.unshift(match);
      console.log('添加新比赛后的列表:', storedMatches);
      
      wx.setStorageSync('matches', storedMatches);
      
      // 验证保存是否成功
      const savedMatches = wx.getStorageSync('matches');
      console.log('保存后重新读取的比赛列表:', savedMatches);
      
      console.log('比赛保存成功:', match);
      
      wx.showToast({
        title: '比赛创建成功',
        icon: 'success'
      });

      // 重置表单和隐藏确认框
      this.setData({
        matchName: '',
        players: [],
        showConfirmDialog: false
      });

      // 跳转到比赛列表页面
      wx.switchTab({
        url: '/pages/match-list/match-list'
      });
    } catch (error) {
      console.error('创建比赛失败:', error);
      wx.showToast({
        title: error.message || '创建比赛失败，请重试',
        icon: 'none'
      });
    }
  },

  // 生成对阵算法 - 集成Python算法
  generateMatches: function() {
    const players = this.data.players;
    const numPlayers = players.length;
    const numMatches = this.data.selectedRounds;
    const levelGap = this.data.levelGap;
    
    console.log('开始生成对阵:', { players, numPlayers, numMatches, levelGap });
    
    if (numPlayers < 4) {
      throw new Error('至少需要4名选手才能生成对阵');
    }
    
    // 构建players对象，格式为 {name: level}
    const playersObj = {};
    players.forEach(player => {
      playersObj[player.name] = parseFloat(player.score);
    });
    
    try {
      const result = this.generateMatchesAdvanced(playersObj, numMatches, levelGap);
      console.log('生成的对阵结果:', result);
      return result;
    } catch (error) {
      console.error('生成对阵失败:', error);
      throw new Error('生成对阵失败: ' + error.message);
    }
  },

  // 羽毛球对阵生成算法
  generateMatchesAdvanced: function(players, n, levelGap) {
    // 输入验证
    if (!players || Object.keys(players).length === 0) {
      throw new Error('选手信息不能为空');
    }
    if (n <= 0) {
      throw new Error('对阵场数必须大于0');
    }
    if (levelGap < 0) {
      throw new Error('等级差不能为负数');
    }

    const playerList = Object.keys(players);
    const numPlayers = playerList.length;
    
    if (numPlayers < 4) {
      throw new Error('至少需要4名选手才能生成对阵');
    }

    console.log('=== 开始生成对阵 ===');
    console.log(`选手数量: ${numPlayers}`);
    console.log(`对阵场数: ${n}`);
    console.log(`等级差限制: ${levelGap}`);

    // Step 1: 生成所有可能的2人组合
    const pairs = this.generateCombinations(playerList, 2);
    console.log(`生成${pairs.length}个2人组合`);

    // Step 2: 生成所有可能的4人对战组合
    const validMatches = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const pair1 = pairs[i];
        const pair2 = pairs[j];
        
        // 确保4个不重复的选手
        const allPlayers = new Set([...pair1, ...pair2]);
        if (allPlayers.size === 4) {
          // 计算两组的等级之和
          const level1 = players[pair1[0]] + players[pair1[1]];
          const level2 = players[pair2[0]] + players[pair2[1]];
          const levelDiff = Math.abs(level1 - level2);
          
          // 检查等级差是否满足要求
          if (levelDiff <= levelGap) {
            validMatches.push({
              pair1: pair1,
              pair2: pair2,
              level1: level1,
              level2: level2,
              levelDiff: levelDiff
            });
          }
        }
      }
    }

    console.log(`生成${validMatches.length}个有效对战组合`);

    if (validMatches.length === 0) {
      throw new Error(`没有找到满足等级差限制(${levelGap})的对战组合`);
    }

    // Step 3: 从有效组合中选择n组，确保每个人出场次数相等
    const result = this.selectBalancedMatches(validMatches, n, playerList, players);
    
    console.log('=== 对阵生成完成 ===');
    return result;
  },

  // 选择平衡的对战组合
  selectBalancedMatches: function(validMatches, n, playerList, players) {
    const maxAttempts = 10000;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      // 打乱有效组合顺序
      this.shuffleArray(validMatches);
      
      const selectedMatches = [];
      const playerCounts = {};
      
      // 初始化每个选手的出场次数
      playerList.forEach(player => {
        playerCounts[player] = 0;
      });
      
      // 尝试选择n组对战
      for (const match of validMatches) {
        if (selectedMatches.length >= n) {
          break;
        }
        
        // 检查这组对战是否会导致出场次数不平衡
        const tempCounts = { ...playerCounts };
        const matchPlayers = [...match.pair1, ...match.pair2];
        
        // 临时增加出场次数
        matchPlayers.forEach(player => {
          tempCounts[player]++;
        });
        
        // 检查是否会导致出场次数差异过大
        const counts = Object.values(tempCounts);
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);
        
        // 如果差异不超过1，则可以选择这组对战
        if (maxCount - minCount <= 1) {
          selectedMatches.push(match);
          // 更新playerCounts对象的内容，而不是重新赋值
          Object.keys(tempCounts).forEach(key => {
            playerCounts[key] = tempCounts[key];
          });
        }
      }
      
      // 如果成功选择了n组对战，检查是否满足平衡条件
      if (selectedMatches.length === n) {
        const counts = Object.values(playerCounts);
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);
        
        // 如果最大差异不超过1，则认为满足平衡条件
        if (maxCount - minCount <= 1) {
          console.log('找到满足条件的对战组合！');
          return this.formatMatches(selectedMatches, playerCounts, players);
        }
      }
      
      attempts++;
    }
    
    throw new Error(`在${maxAttempts}次尝试后仍无法找到满足平衡条件的${n}组对战`);
  },

  // 格式化对战结果
  formatMatches: function(matches, playerCounts, players) {
    const result = [];
    
    console.log('\n=== 生成的对阵详情 ===');
    matches.forEach((match, index) => {
              // 只需要一个场次标记，从1到n
        const matchNumber = index + 1;
        
        const matchObj = {
          id: index + 1,
          matchNumber: matchNumber,
        team1: {
          player1: { name: match.pair1[0], level: players[match.pair1[0]] },
          player2: { name: match.pair1[1], level: players[match.pair1[1]] },
          levelSum: match.level1
        },
        team2: {
          player1: { name: match.pair2[0], level: players[match.pair2[0]] },
          player2: { name: match.pair2[1], level: players[match.pair2[1]] },
          levelSum: match.level2
        },
        levelDiff: match.levelDiff
      };
      
      result.push(matchObj);
      
              console.log(`第${matchNumber}场: (${match.pair1[0]}+${match.pair1[1]}) vs (${match.pair2[0]}+${match.pair2[1]})`);
        console.log(`  等级和: ${match.level1.toFixed(1)} vs ${match.level2.toFixed(1)}`);
        console.log(`  等级差: ${match.levelDiff.toFixed(1)}`);
    });
    
    console.log('\n=== 选手出场统计 ===');
    Object.entries(playerCounts).forEach(([player, count]) => {
      console.log(`${player}: ${count}场`);
    });
    
    // 对比赛序列进行排序优化，确保相邻比赛参赛队员不重复
    const optimizedResult = this.optimizeMatchSequence(result);
    
    return {
      matches: optimizedResult,
      playerCounts: playerCounts
    };
  },

  // 优化比赛序列，确保相邻比赛参赛队员不重复
  optimizeMatchSequence: function(matches) {
    if (matches.length <= 1) {
      return matches;
    }
    
    console.log('\n=== 开始优化比赛序列 ===');
    
    const result = [matches[0]]; // 第一场比赛保持不变
    const remaining = [...matches.slice(1)];
    
    while (remaining.length > 0) {
      let bestNextIndex = -1;
      let bestScore = -1;
      
      // 找到与当前最后一场比赛冲突最少的下一场比赛
      for (let i = 0; i < remaining.length; i++) {
        const currentMatch = result[result.length - 1];
        const nextMatch = remaining[i];
        
        // 计算冲突分数（重复选手数量）
        const conflictScore = this.calculateConflictScore(currentMatch, nextMatch);
        
        // 冲突越少，分数越高
        const score = 4 - conflictScore; // 4个选手，无冲突时分数为4
        
        if (score > bestScore) {
          bestScore = score;
          bestNextIndex = i;
        }
      }
      
      // 如果找不到无冲突的比赛，选择冲突最少的
      if (bestNextIndex === -1) {
        bestNextIndex = 0;
      }
      
      // 将选中的比赛添加到结果中
      const selectedMatch = remaining.splice(bestNextIndex, 1)[0];
      result.push(selectedMatch);
      
      console.log(`选择第${selectedMatch.matchNumber}场作为下一场，冲突分数: ${4 - bestScore}`);
    }
    
    // 重新编号比赛场次
    result.forEach((match, index) => {
      match.id = index + 1;
      match.matchNumber = index + 1;
    });
    
    console.log('\n=== 优化后的比赛序列 ===');
    result.forEach((match, index) => {
      const players = [
        match.team1.player1.name,
        match.team1.player2.name,
        match.team2.player1.name,
        match.team2.player2.name
      ];
      console.log(`第${match.matchNumber}场: ${players.join(', ')}`);
    });
    
    return result;
  },

  // 计算两场比赛之间的冲突分数（重复选手数量）
  calculateConflictScore: function(match1, match2) {
    const players1 = new Set([
      match1.team1.player1.name,
      match1.team1.player2.name,
      match1.team2.player1.name,
      match1.team2.player2.name
    ]);
    
    const players2 = new Set([
      match2.team1.player1.name,
      match2.team1.player2.name,
      match2.team2.player1.name,
      match2.team2.player2.name
    ]);
    
    let conflicts = 0;
    for (const player of players1) {
      if (players2.has(player)) {
        conflicts++;
      }
    }
    
    return conflicts;
  },

  // 生成组合
  generateCombinations: function(arr, r) {
    const combinations = [];
    const n = arr.length;
    
    function backtrack(start, combo) {
      if (combo.length === r) {
        combinations.push([...combo]);
        return;
      }
      
      for (let i = start; i < n; i++) {
        combo.push(arr[i]);
        backtrack(i + 1, combo);
        combo.pop();
      }
    }
    
    backtrack(0, []);
    return combinations;
  },

  // 检查两个集合是否有交集
  hasIntersection: function(set1, set2) {
    for (const item of set1) {
      if (set2.has(item)) {
        return true;
      }
    }
    return false;
  },

  // 获取配对键
  getPairKey: function(pair) {
    return pair.sort().join(',');
  },

  // 打乱数组
  shuffleArray: function(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  },

  // 计算每个选手参与的比赛次数
  calculatePlayerCounts: function(matches) {
    const counts = {};
    matches.forEach(match => {
      const players = [
        match.team1.player1.name,
        match.team1.player2.name,
        match.team2.player1.name,
        match.team2.player2.name
      ];
      players.forEach(player => {
        counts[player] = (counts[player] || 0) + 1;
      });
    });
    return counts;
  },

  // 计算轮空次数 - 新算法中不再需要
  calculateByeCounts: function(matches) {
    return {};
  }
}); 