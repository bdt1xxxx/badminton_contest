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
    selectedRounds: 4,
    courtCount: 2, // 场地数量，默认为2
    // 进度跟踪变量
    progressInfo: {
      currentAlgorithm: '',
      currentPhase: '',
      progress: 0,
      totalSteps: 0,
      lastToastTime: 0
    }
  },

  onLoad: function () {
    console.log('页面加载成功');
  },

  // 输入比赛名称
  onMatchNameInput: function (e) {
    console.log('输入比赛名称:', e.detail.value);
    this.setData({
      matchName: e.detail.value
    });
  },

  // 选择比赛类型
  onTypeChange: function (e) {
    console.log('选择比赛类型:', e.detail.value);
    const matchType = this.data.matchTypes[e.detail.value];
    this.setData({
      matchType: matchType
    });
  },

  // 设置最大参赛人数
  onMaxPlayersChange: function (e) {
    console.log('设置参赛人数:', e.detail.value);
    const newMaxPlayers = parseInt(e.detail.value) + 1;
    this.setData({
      maxPlayers: newMaxPlayers
    });
  },

  // 选择场地数量
  onCourtCountChange: function (e) {
    const courtCount = parseInt(e.detail.value) + 1;
    console.log('选择场地数量:', courtCount);
    this.setData({
      courtCount: courtCount
    });
  },

  // 输入参赛选手姓名
  onPlayerInput: function (e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    console.log('输入选手姓名:', index, value);

    // 简单的选手管理
    const players = this.data.players;
    if (value && value.trim()) {
      if (index >= players.length) {
        players.push({
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
  onScoreChange: function (e) {
    const index = e.currentTarget.dataset.index;
    const scoreIndex = e.detail.value;
    const scores = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
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
  showConfirmDialog: function () {
    console.log('显示确认对话框');
    if (!this.data.matchName || !this.data.matchName.trim()) {
      this.showTips('请输入比赛名称');
      return;
    }

    if (this.data.players.length < 2) {
      this.showTips('至少需要2名参赛选手');
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
  hideConfirmDialog: function () {
    this.setData({
      showConfirmDialog: false
    });
  },

  // 组间等级差距变化
  onLevelGapChange: function (e) {
    const index = e.detail.value;
    const levelGap = [0, 0.5, 1, 1.5, 2][index];
    console.log('组间等级差距变化:', levelGap);

    this.setData({
      levelGapIndex: index,
      levelGap: levelGap
    });
  },

  // 选择比赛局数
  onRoundSelect: function (e) {
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
  createMatch: function () {
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
      const generatedMatches = this.data.matchType === "单打"
        ? this.generateSinglesMatches()
        : this.generateDoublesMatches();
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

      this.showTips('比赛创建成功');

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
      this.showTips(error.message || '创建比赛失败，请重试');
    }
  },

  showTips: function(title, icon='none', duration=1000) {
    wx.showToast({
      title: title,
      icon: icon,
      duration: duration
    });
    console.log(title);
  },

  // 生成单打对阵算法
  generateSinglesMatches: function () {},

  // 生成双打对阵算法
  generateDoublesMatches: function () {
    const players = this.data.players;
    const numPlayers = players.length;
    const numMatches = this.data.selectedRounds;
    const levelGap = this.data.levelGap;

    this.showTips('开始生成对阵:');
    console.log('players:', { players });
    console.log('numPlayers:', { numPlayers });
    console.log('numMatches:', { numMatches });
    console.log('levelGap:', { levelGap });

    if (numPlayers < 4) {
      this.showTips('至少需要4名选手才能生成对阵');
      throw new Error('至少需要4名选手才能生成对阵');
    }

    // 构建players对象，格式为 {name: level}
    const playersObj = {};
    players.forEach(player => {
      playersObj[player.name] = parseFloat(player.score);
    });

    // 输入验证
    if (!playersObj || Object.keys(playersObj).length === 0) {
      this.showTips('选手信息不能为空');
      throw new Error('选手信息不能为空');
    }
    if (numMatches <= 0) {
      this.showTips('对阵场数必须大于0');
      throw new Error('对阵场数必须大于0');
    }
    if (levelGap < 0) {
      this.showTips('等级差不能为负数');
      throw new Error('等级差不能为负数');
    }

    const playerList = Object.keys(playersObj);
    const pairs = this.generatePlayerPairs(playerList);
    const validMatches = this.generateValidMatches(pairs, playersObj, levelGap);
    return this.selectMatchesByStrategy(validMatches, numMatches, playerList, playersObj);
  },

  // 生成所有可能的2人组合
  generatePlayerPairs: function (playerList) {
    const pairs = this.generateCombinations(playerList, 2);
    this.showTips(`生成${pairs.length}个2人组合`);
    return pairs;
  },

  // 生成所有可能的4人对战组合（满足等级差限制）
  generateValidMatches: function (pairs, playersObj, levelGap) {
    const validMatches = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const pair1 = pairs[i];
        const pair2 = pairs[j];

        const allPlayers = new Set([...pair1, ...pair2]);
        if (allPlayers.size !== 4) continue;

        const level1 = playersObj[pair1[0]] + playersObj[pair1[1]];
        const level2 = playersObj[pair2[0]] + playersObj[pair2[1]];
        const levelDiff = Math.abs(level1 - level2);

        if (levelDiff <= levelGap) {
          validMatches.push({ pair1, pair2, level1, level2, levelDiff });
        }
      }
    }

    console.log(`生成${validMatches.length}个有效对战组合`);

    if (validMatches.length === 0) {
      throw new Error(`没有找到满足等级差限制(${levelGap})的对战组合`);
    }

    return validMatches;
  },

  // 从有效组合中选择n组，确保每个人出场次数相等
  selectMatchesByStrategy: function (validMatches, numMatches, playerList, playersObj) {
    console.log('\n=== 开始执行策略链生成对阵 ===');

    const strategies = [
      {
        name: '回溯法(MRV)',
        method: 'selectBalancedMatchesBackTraceMRV',
        toast: '回溯法(MRV)未找到，尝试普通回溯'
      },
      // {
      //   name: '回溯法',
      //   method: 'selectBalancedMatchesBackTrace',
      //   toast: '回溯法未找到最优解，使用备选方案'
      // },
      {
        name: '暴力法',
        method: 'selectBalancedMatches',
        toast: '无法找到符合要求的对战组合'
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      console.log(`\n=== 尝试策略${i + 1}: ${strategy.name} ===`);
      this.showTips(`开始执行: ${strategy.name}`, 'none', 1500);
      this.sleep(200);

      try {
        const result = this[strategy.method](validMatches, numMatches, playerList, playersObj);

        if (result) {
          console.log(`✅ ${strategy.name}成功生成对阵！`);
          return result;
        }

        if (i < strategies.length - 1) {
          console.log(`❌ ${strategy.name}失败，尝试下一个策略`);
          this.showTips(strategy.toast, 'none', 1000);
          this.sleep(1000);
        }
      } catch (error) {
        console.error(`${strategy.name}执行出错:`, error);

        if (i < strategies.length - 1) {
          this.showTips(strategy.toast, 'none', 1000);
          this.sleep(1000);
        }
      }
    }

    throw new Error('所有对阵生成策略都失败了');
  },

  // 使用回溯法(MRV启发式)选择平衡的对战组合
  // 关键差异 vs selectBalancedMatchesBackTrace：
  //  1. 每层选择当前出场次数最少的选手 P，仅在包含 P 的对阵中枚举（强约束变量优先）
  //  2. 强可行性剪枝：need[p]=targetCount-counts[p] vs supply[p]=剩余对阵中含 p 的数量
  //  3. 状态用数组下标 + in-place +/-，避免每层深拷贝
  //  4. 步数上限 + 时间上限双重看门狗，保证主线程最坏耗时可控
  selectBalancedMatchesBackTraceMRV: function (validMatches, n, playerList, players) {
    console.log('\n=== 使用回溯法(MRV)选择平衡对战组合 ===');

    const P = playerList.length;
    if ((n * 4) % P !== 0) {
      console.log('每人出场次数不是整数，无解');
      return null;
    }
    const targetCount = (n * 4) / P;
    console.log(`目标：每个选手出场${targetCount}次`);

    // player 名 -> 下标
    const idxOf = {};
    for (let i = 0; i < P; i++) idxOf[playerList[i]] = i;

    // 预处理每个对阵的 4 个选手下标
    const M = validMatches.length;
    const matchPlayers = new Array(M);
    for (let i = 0; i < M; i++) {
      const m = validMatches[i];
      matchPlayers[i] = [
        idxOf[m.pair1[0]], idxOf[m.pair1[1]],
        idxOf[m.pair2[0]], idxOf[m.pair2[1]]
      ];
    }

    // 每个选手对应的对阵下标列表
    const matchesByPlayer = Array.from({ length: P }, () => []);
    for (let i = 0; i < M; i++) {
      const ps = matchPlayers[i];
      matchesByPlayer[ps[0]].push(i);
      matchesByPlayer[ps[1]].push(i);
      matchesByPlayer[ps[2]].push(i);
      matchesByPlayer[ps[3]].push(i);
    }

    const counts = new Array(P).fill(0);            // 出场次数
    const supply = matchesByPlayer.map(a => a.length); // 剩余可用对阵中含该选手的数量
    const used = new Uint8Array(M);                  // 是否已被选中
    const excluded = new Uint8Array(M);              // 是否已被排除（在当前路径上）
    const selected = [];                             // 选中的对阵下标

    const startTime = Date.now();
    const TIME_LIMIT = 10000;
    const STEP_LIMIT = 200000;
    let steps = 0;
    let timedOut = false;

    // 排除某个对阵（不再可选）：从 supply 中扣除其 4 个选手
    const excludeMatch = (i) => {
      excluded[i] = 1;
      const ps = matchPlayers[i];
      supply[ps[0]]--; supply[ps[1]]--; supply[ps[2]]--; supply[ps[3]]--;
    };
    const restoreMatch = (i) => {
      excluded[i] = 0;
      const ps = matchPlayers[i];
      supply[ps[0]]++; supply[ps[1]]++; supply[ps[2]]++; supply[ps[3]]++;
    };

    // 选中某对阵（参与方 +1，从 supply 扣除 4 次）
    const pickMatch = (i) => {
      used[i] = 1;
      excluded[i] = 1;
      const ps = matchPlayers[i];
      counts[ps[0]]++; counts[ps[1]]++; counts[ps[2]]++; counts[ps[3]]++;
      supply[ps[0]]--; supply[ps[1]]--; supply[ps[2]]--; supply[ps[3]]--;
      selected.push(i);
    };
    const unpickMatch = (i) => {
      used[i] = 0;
      excluded[i] = 0;
      const ps = matchPlayers[i];
      counts[ps[0]]--; counts[ps[1]]--; counts[ps[2]]--; counts[ps[3]]--;
      supply[ps[0]]++; supply[ps[1]]++; supply[ps[2]]++; supply[ps[3]]++;
      selected.pop();
    };

    // 强可行性剪枝
    const feasible = () => {
      for (let p = 0; p < P; p++) {
        if (counts[p] > targetCount) return false;
        const need = targetCount - counts[p];
        if (supply[p] < need) return false;
      }
      return true;
    };

    // 选择下一个分支变量：尚未达标且 need 最大的选手；并列时取 supply 最小的（最受约束）
    const pickBranchPlayer = () => {
      let best = -1;
      let bestNeed = -1;
      let bestSupply = Infinity;
      for (let p = 0; p < P; p++) {
        const need = targetCount - counts[p];
        if (need <= 0) continue;
        if (need > bestNeed || (need === bestNeed && supply[p] < bestSupply)) {
          best = p;
          bestNeed = need;
          bestSupply = supply[p];
        }
      }
      return best;
    };

    const search = () => {
      if (++steps > STEP_LIMIT) { timedOut = true; return false; }
      if ((steps & 1023) === 0 && Date.now() - startTime > TIME_LIMIT) {
        timedOut = true; return false;
      }

      if (selected.length === n) {
        // 所有选手出场次数应 == targetCount（feasible 已保证不超）
        for (let p = 0; p < P; p++) if (counts[p] !== targetCount) return false;
        return true;
      }

      if (!feasible()) return false;

      const p = pickBranchPlayer();
      if (p === -1) return false; // 还没选满 n 场但所有人都已达标 -> 矛盾

      // 候选：包含 p 且当前未被使用/排除的对阵
      const candidates = matchesByPlayer[p];
      // 子节点排序：优先选"使其他短缺选手 supply 不至于打穿"的对阵
      // 简单启发：优先与 p 一同出现的另一短缺选手所在的对阵 —— 用 counts 总和最低做近似
      const ordered = [];
      for (let k = 0; k < candidates.length; k++) {
        const i = candidates[k];
        if (used[i] || excluded[i]) continue;
        const ps = matchPlayers[i];
        // 4 名选手当前出场总和：越小说明本场带的"短缺人"越多，更值得早试
        const score = counts[ps[0]] + counts[ps[1]] + counts[ps[2]] + counts[ps[3]];
        ordered.push({ i, score });
      }
      ordered.sort((a, b) => a.score - b.score);

      for (let k = 0; k < ordered.length; k++) {
        const i = ordered[k].i;
        // 选这个对阵
        pickMatch(i);
        if (search()) return true;
        unpickMatch(i);
        if (timedOut) return false;
        // 不选这个对阵：从 supply 中暂时扣除（仍占 p 的需求）
        excludeMatch(i);
      }
      // 回溯前恢复本层所有"排除"
      for (let k = 0; k < ordered.length; k++) {
        const i = ordered[k].i;
        if (excluded[i] && !used[i]) restoreMatch(i);
      }
      return false;
    };

    const ok = search();
    console.log(`MRV 回溯结束：steps=${steps}, 耗时=${Date.now() - startTime}ms, ok=${ok}, timedOut=${timedOut}`);

    if (!ok) return null;

    // 还原成上层期望的格式
    const matches = selected.map(i => validMatches[i]);
    const playerCounts = {};
    for (let p = 0; p < P; p++) playerCounts[playerList[p]] = counts[p];
    return this.formatMatches(matches, playerCounts, players);
  },

  // 使用回溯法选择平衡的对战组合
  selectBalancedMatchesBackTrace: function (validMatches, n, playerList, players) {
    console.log('\n=== 使用回溯法选择平衡对战组合 ===');

    // 计算每个选手应该的出场次数
    const targetCount = (n * 4) / playerList.length;
    console.log(`目标：每个选手出场${targetCount}次`);

    // 性能优化：如果搜索空间过大，直接返回null
    const searchSpace = this.calculateSearchSpace(validMatches.length, n, playerList.length);
    if (searchSpace > 100000000) { // 超过100万种组合
      console.log(`⚠️ 搜索空间过大(${searchSpace.toExponential(2)})，跳过回溯法`);
      return null;
    }

    // 初始化选手出场次数和已选择的对战
    const playerCounts = {};
    playerList.forEach(player => {
      playerCounts[player] = 0;
    });

    // 设置超时时间（5秒）
    const startTime = Date.now();
    const timeout = 10000;

    // 调用回溯函数
    const result = this.backtrack(validMatches, n, playerCounts, targetCount, playerList, players, [], 0, startTime, timeout);

    if (result) {
      return this.formatMatches(result.matches, result.playerCounts, players);
    } else {
      return null; // 返回null表示失败
    }
  },

  // 同步延迟函数
  sleep: function (ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // 阻塞主线程
    }
  },

  // 智能进度提示系统
  updateProgress: function (algorithm, phase, currentStep, totalSteps) {
    const now = Date.now();
    const progress = Math.floor((currentStep / totalSteps) * 100);
    
    // 更新进度信息
    this.setData({
      'progressInfo.currentAlgorithm': algorithm,
      'progressInfo.currentPhase': phase,
      'progressInfo.progress': progress,
      'progressInfo.totalSteps': totalSteps
    });
    
    // 每10%进度显示一次toast，但避免过于频繁（至少间隔1秒）
    if (progress % 10 === 0 && (now - this.data.progressInfo.lastToastTime) > 1000) {
      const message = `${algorithm} - ${phase}\n进度: ${progress}%`;
      
      this.showTips(message, 'none', 1500);
      
      // 更新最后显示toast的时间
      this.setData({
        'progressInfo.lastToastTime': now
      });
    }
  },

  // 显示算法开始提示
  showAlgorithmStart: function (algorithm, totalSteps) {
    const message = `开始使用${algorithm}\n预计${totalSteps.toLocaleString()}步`;
    
    this.showTips(message, 'none', 2000);
    
    // 重置进度信息
    this.setData({
      'progressInfo.currentAlgorithm': algorithm,
      'progressInfo.currentPhase': '初始化',
      'progressInfo.progress': 0,
      'progressInfo.totalSteps': totalSteps,
      'progressInfo.lastToastTime': Date.now()
    });
  },

  // 显示算法完成提示
  showAlgorithmComplete: function (algorithm, success) {
    const message = success ? 
      `${algorithm}执行完成！` : 
      `${algorithm}未找到解`;
    
    this.showTips(message, success ? 'success' : 'none', 2000);
  },

  // 回溯函数
  backtrack: function (validMatches, n, playerCounts, targetCount, playerList, players, selectedMatches, startIndex, startTime, timeout) {
    // 超时检查
    if (Date.now() - startTime > timeout) {
      console.log('⏰ 回溯法超时，停止搜索');
      return null;
    }

    // 检查是否已经选择了足够的对战
    if (selectedMatches.length >= n) {
      // 检查是否所有选手出场次数都相等
      const counts = Object.values(playerCounts);
      const firstCount = counts[0];
      const allEqual = counts.every(count => count === firstCount);

      if (allEqual) {
        console.log('找到满足条件的组合！');
        return {
          matches: [...selectedMatches],
          playerCounts: { ...playerCounts }
        };
      }
      return null;
    }

    // 优化剪枝：检查是否还有可能达到目标
    if (!this.canReachTarget(playerCounts, targetCount, n - selectedMatches.length, playerList)) {
      return null;
    }

    // 检查是否有选手出场次数超出目标
    for (const player of playerList) {
      if (playerCounts[player] > targetCount) {
        return null; // 结束本次探索
      }
    }

    // 尝试添加下一个对战，从startIndex开始
    for (let i = startIndex; i < validMatches.length; i++) {
      const match = validMatches[i];

      // 检查这组对战是否会导致出场次数不平衡
      const tempCounts = { ...playerCounts };
      const matchPlayers = [...match.pair1, ...match.pair2];

      // 临时增加出场次数
      matchPlayers.forEach(player => {
        tempCounts[player]++;
      });

      // 检查是否会导致出场次数超出目标
      let valid = true;
      for (const player of playerList) {
        if (tempCounts[player] > targetCount) {
          valid = false;
          break;
        }
      }

      if (valid) {
        // 递归调用，传入i+1作为下一个startIndex
        const result = this.backtrack(validMatches, n, tempCounts, targetCount, playerList, players, [...selectedMatches, match], i + 1, startTime, timeout);
        if (result) {
          return result;
        }
      }
    }

    return null;
  },

  // 检查是否还有可能达到目标
  canReachTarget: function(currentCounts, targetCount, remainingMatches, playerList) {
    const counts = Object.values(currentCounts);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    
    // 如果当前最大差异已经超过剩余比赛能弥补的范围，则不可能达到目标
    const maxPossibleDiff = maxCount - minCount;
    const maxPossibleImprovement = remainingMatches * 2; // 每场比赛最多能减少2的差异
    
    if (maxPossibleDiff > maxPossibleImprovement) {
      return false;
    }
    
    // 检查是否有选手已经超出太多
    for (const count of counts) {
      if (count > targetCount + remainingMatches) {
        return false;
      }
    }
    
    return true;
  },


  // 选择平衡的对战组合
  selectBalancedMatches: function (validMatches, n, playerList, players) {
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

        // 检查这组对战是否会导致出场次数差异过大
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

        // 允许一定的差异，但不能过大（差异不超过2）
        if (maxCount - minCount <= 2) {
          selectedMatches.push(match);
          // 更新playerCounts对象的内容，而不是重新赋值
          Object.keys(tempCounts).forEach(key => {
            playerCounts[key] = tempCounts[key];
          });
        }
      }

      // 如果成功选择了n组对战，检查是否满足完全相等条件
      if (selectedMatches.length === n) {
        const counts = Object.values(playerCounts);
        const firstCount = counts[0];
        const allEqual = counts.every(count => count === firstCount);

        // 只有当所有选手出场次数都相等时，才认为满足条件
        if (allEqual) {
          console.log('找到满足条件的对战组合！所有选手出场次数相等');
          console.log('选手出场次数:', playerCounts);
          return this.formatMatches(selectedMatches, playerCounts, players);
        }
      }

      attempts++;
    }

    throw new Error(`在${maxAttempts}次尝试后仍无法找到满足完全相等条件的${n}组对战`);
  },


  // 兜底策略：使用最简单的随机选择方法
  selectBalancedMatchesFallback: function (validMatches, n, playerList, players) {
    console.log('\n=== 使用兜底策略生成对阵 ===');
    console.log('⚠️ 所有优化策略都失败了，使用最简单的随机选择方法');

    // 随机选择n组对战，不保证平衡
    const shuffled = [...validMatches];
    this.shuffleArray(shuffled);
    const selectedMatches = shuffled.slice(0, n);

    // 计算选手出场次数
    const playerCounts = {};
    playerList.forEach(player => {
      playerCounts[player] = 0;
    });

    selectedMatches.forEach(match => {
      const matchPlayers = [...match.pair1, ...match.pair2];
      matchPlayers.forEach(player => {
        playerCounts[player]++;
      });
    });

    console.log('兜底策略生成的选手出场次数:', playerCounts);
    console.log('⚠️ 注意：兜底策略不保证选手出场次数完全相等');

    return this.formatMatches(selectedMatches, playerCounts, players);
  },

  // 格式化对战结果
  formatMatches: function (matches, playerCounts, players) {
    const result = [];

    console.log('\n=== 生成的对阵详情 ===');
    console.log(`输入的对阵数量: ${matches.length}`);
    matches.forEach((match, index) => {
      // 只需要一个场次标记，从1到n
      const matchId = index + 1;

      const matchObj = {
        id: matchId,
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

      console.log(`第${matchId}场: (${match.pair1[0]}+${match.pair1[1]}) vs (${match.pair2[0]}+${match.pair2[1]})`);
      console.log(`  等级和: ${match.level1.toFixed(1)} vs ${match.level2.toFixed(1)}`);
      console.log(`  等级差: ${match.levelDiff.toFixed(1)}`);
    });

    console.log('\n=== 选手出场统计 ===');
    Object.entries(playerCounts).forEach(([player, count]) => {
      console.log(`${player}: ${count}场`);
    });

    // 对比赛序列进行排序优化，确保相邻比赛参赛队员不重复
    console.log(`优化前的对阵数量: ${result.length}`);
    const optimizedResult = this.optimizeMatchSequence(result);
    console.log(`优化后的对阵数量: ${optimizedResult.length}`);

    return {
      matches: optimizedResult,
      playerCounts: playerCounts
    };
  },

  // 优化比赛序列，确保相邻比赛参赛队员不重复
  optimizeMatchSequence: function (matches) {
    console.log(`\n=== 开始优化比赛序列 ===`);
    console.log(`输入的比赛数量: ${matches.length}`);
    
    if (matches.length <= 1) {
      console.log('比赛数量 <= 1，直接返回');
      return matches;
    }

    // 尝试多次优化，直到找到无冲突的序列
    const maxAttempts = 10;
    let bestResult = null;
    let bestConflictCount = Infinity;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`\n--- 第${attempt}次尝试优化 ---`);

      let result = this.attemptOptimization(matches);
      const totalConflicts = this.calculateTotalConflicts(result);

      console.log(`第${attempt}次尝试结果: 总冲突数 = ${totalConflicts}`);

      if (totalConflicts === 0) {
        console.log('✅ 找到完全无冲突的比赛序列！');
        // 重新编号，确保ID连续
        this.renumberMatches(result);
        return result;
      }

      if (totalConflicts < bestConflictCount) {
        bestConflictCount = totalConflicts;
        bestResult = result;
        console.log(`更新最佳结果: 总冲突数 = ${bestConflictCount}`);
      }

      // 如果冲突数很少，也可以接受
      if (totalConflicts <= 1) {
        console.log(`✅ 找到低冲突的比赛序列，冲突数 = ${totalConflicts}`);
        // 重新编号，确保ID连续
        this.renumberMatches(result);
        // 重新排序：冲突比赛排在后面
        result = this.reorderMatchesByConflict(result);
        // 再次重新编号，确保ID连续
        this.renumberMatches(result);
        // 显示冲突总结
        this.showConflictSummary(result);
        return result;
      }
    }

    console.log(`⚠️ 经过${maxAttempts}次尝试，未找到完全无冲突的序列，返回最佳结果`);

    // 重新编号，确保ID连续
    this.renumberMatches(bestResult);
    
    // 重新排序：冲突比赛排在后面
    bestResult = this.reorderMatchesByConflict(bestResult);
    
    // 再次重新编号，确保ID连续
    this.renumberMatches(bestResult);

    // 显示最终结果和冲突提示
    console.log('\n=== 最终优化结果 ===');
    console.log(`最终返回的比赛数量: ${bestResult.length}`);
    this.showConflictSummary(bestResult);

    return bestResult;
  },

  // 重新编号比赛，确保ID连续
  renumberMatches: function (matches) {
    console.log('\n=== 重新编号比赛 ===');
    matches.forEach((match, index) => {
      const oldId = match.id;
      match.id = index + 1;
      console.log(`第${oldId}场 → 第${match.id}场`);
    });
    console.log('✅ 比赛编号已重新排序');
  },

  // 重新排序比赛，将冲突比赛排在后面
  reorderMatchesByConflict: function (matches) {
    console.log('\n=== 重新排序比赛（冲突比赛排在后面）===');
    console.log(`输入的比赛数量: ${matches.length}`);
    
    const conflictMatches = [];
    const nonConflictMatches = [];
    const courtCount = this.data.courtCount;
    
    // 第一场比赛总是无冲突的
    nonConflictMatches.push(matches[0]);
    
    // 根据场地数量决定冲突检测策略
    if (courtCount === 2) {
      // 2块场地：检查同时进行的比赛之间的冲突
      // 第1场和第2场同时进行，第3场和第4场同时进行，以此类推
      for (let i = 0; i < matches.length; i += 2) {
        if (i + 1 < matches.length) {
          // 检查第i场和第i+1场之间的冲突
          const match1 = matches[i];      // 第1场、第3场、第5场...
          const match2 = matches[i + 1];  // 第2场、第4场、第6场...
          const conflictScore = this.calculateConflictScore(match1, match2);
          
          if (conflictScore === 0) {
            // 无冲突，两场比赛都放在前面
            if (i === 0) {
              // 第一场比赛已经在前面了，只需要添加第二场
              nonConflictMatches.push(match2);
            } else {
              // 添加两场比赛
              nonConflictMatches.push(match1);
              nonConflictMatches.push(match2);
            }
          } else {
            // 有冲突，标记为冲突比赛
            match1.hasConflict = true;
            match1.conflictWith = match2.id;
            match1.conflictScore = conflictScore;
            match2.hasConflict = true;
            match2.conflictWith = match1.id;
            match2.conflictScore = conflictScore;
            conflictMatches.push(match1);
            conflictMatches.push(match2);
          }
        } else {
          // 如果最后一场比赛是奇数场次，单独处理
          const lastMatch = matches[i];
          if (i > 0) {
            nonConflictMatches.push(lastMatch);
          }
        }
      }
    } else {
      // 其他场地数量：检查所有相邻场次的冲突
      for (let i = 1; i < matches.length; i++) {
        const currentMatch = matches[i];
        const prevMatch = matches[i - 1];
        const conflictScore = this.calculateConflictScore(prevMatch, currentMatch);
        
        if (conflictScore === 0) {
          // 无冲突，继续放在前面
          nonConflictMatches.push(currentMatch);
        } else {
          // 有冲突，标记为冲突比赛
          currentMatch.hasConflict = true;
          currentMatch.conflictWith = prevMatch.id;
          currentMatch.conflictScore = conflictScore;
          conflictMatches.push(currentMatch);
        }
      }
    }
    
    // 重新组合：无冲突比赛在前，冲突比赛在后
    const reorderedMatches = [...nonConflictMatches, ...conflictMatches];
    
    console.log(`无冲突比赛: ${nonConflictMatches.length}场`);
    console.log(`冲突比赛: ${conflictMatches.length}场`);
    console.log(`重新排序后的总比赛数: ${reorderedMatches.length}场`);
    
    if (conflictMatches.length > 0) {
      console.log('⚠️ 存在冲突的比赛:');
      conflictMatches.forEach(match => {
        // 找到与当前比赛冲突的前一场比赛
        const prevMatch = nonConflictMatches.find(m => m.id === match.conflictWith);
        if (prevMatch) {
          const conflictingPlayers = this.getConflictingPlayers(prevMatch, match);
          console.log(`  第${match.id}场与第${match.conflictWith}场有${match.conflictScore}个重复选手: ${conflictingPlayers.join(', ')}`);
        }
      });
    }
    
    return reorderedMatches;
  },

  // 显示冲突总结
  showConflictSummary: function (matches) {
    console.log('\n=== 比赛冲突总结 ===');
    
    let totalConflicts = 0;
    const conflictDetails = [];
    const courtCount = this.data.courtCount;
    
    // 根据场地数量决定冲突检测策略
    if (courtCount === 2) {
      // 2块场地：检查同时进行的比赛之间的冲突
      // 第1场和第2场同时进行，第3场和第4场同时进行，以此类推
      for (let i = 0; i < matches.length; i += 2) {
        if (i + 1 < matches.length) {
          // 检查第i场和第i+1场之间的冲突
          const match1 = matches[i];      // 第1场、第3场、第5场...
          const match2 = matches[i + 1];  // 第2场、第4场、第6场...
          const conflictScore = this.calculateConflictScore(match1, match2);
          
          if (conflictScore > 0) {
            totalConflicts += conflictScore;
            const conflictingPlayers = this.getConflictingPlayers(match1, match2);
            conflictDetails.push({
              match1: match1.id,
              match2: match2.id,
              conflictScore: conflictScore,
              players: conflictingPlayers
            });
          }
        }
      }
    } else {
      // 其他场地数量：检查所有相邻场次的冲突
      for (let i = 1; i < matches.length; i++) {
        const currentMatch = matches[i];
        const prevMatch = matches[i - 1];
        const conflictScore = this.calculateConflictScore(prevMatch, currentMatch);
        
        if (conflictScore > 0) {
          totalConflicts += conflictScore;
          const conflictingPlayers = this.getConflictingPlayers(prevMatch, currentMatch);
          conflictDetails.push({
            match1: prevMatch.id,
            match2: currentMatch.id,
            conflictScore: conflictScore,
            players: conflictingPlayers
          });
        }
      }
    }
    
    // 显示每场比赛的选手
    matches.forEach((match, index) => {
      const players = [
        match.team1.player1.name,
        match.team1.player2.name,
        match.team2.player1.name,
        match.team2.player2.name
      ];
      const conflictMark = match.hasConflict ? ' ⚠️' : '';
      console.log(`第${match.id}场: ${players.join(', ')}${conflictMark}`);
    });
    
    // 显示冲突详情
    if (conflictDetails.length > 0) {
      console.log(`\n⚠️ 发现 ${conflictDetails.length} 处冲突:`);
      conflictDetails.forEach((conflict, index) => {
        console.log(`  ${index + 1}. 第${conflict.match1}场与第${conflict.match2}场有${conflict.conflictScore}个重复选手: ${conflict.players.join(', ')}`);
      });
      
      console.log(`\n总冲突数: ${totalConflicts}`);
      console.log('💡 提示：冲突的比赛已排在序列末尾，建议安排休息时间');
    } else {
      console.log('\n🎉 完美！所有相邻比赛都无重复选手');
    }
    
    // 显示无冲突和冲突比赛的统计
    const nonConflictCount = matches.filter(m => !m.hasConflict).length;
    const conflictCount = matches.filter(m => m.hasConflict).length;
    
    console.log(`\n📊 统计信息:`);
    console.log(`  无冲突比赛: ${nonConflictCount}场`);
    console.log(`  冲突比赛: ${conflictCount}场`);
    console.log(`  总比赛数: ${matches.length}场`);
    
    if (conflictCount > 0) {
      console.log(`\n🔧 建议:`);
      console.log(`  1. 前${nonConflictCount}场比赛可以连续进行`);
      console.log(`  2. 第${nonConflictCount + 1}场开始有冲突，建议安排休息时间`);
      console.log(`  3. 或者调整选手安排，减少冲突`);
    }
  },

  // 单次尝试优化（改进版：优先安排无冲突比赛）
  attemptOptimization: function (matches) {
    const result = [matches[0]]; // 第一场比赛保持不变
    let remaining = [...matches.slice(1)];

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

      // 将选中的比赛添加到结果中
      const selectedMatch = remaining.splice(bestNextIndex, 1)[0];
      result.push(selectedMatch);
    }

    return result;
  },

  // 计算整个序列的总冲突数
  calculateTotalConflicts: function (matches) {
    let totalConflicts = 0;
    const courtCount = this.data.courtCount;

    // 根据场地数量决定冲突检测策略
    if (courtCount === 2) {
      // 2块场地：只检测同时进行的比赛之间的冲突
      // 第1场和第2场同时进行，第3场和第4场同时进行，以此类推
      for (let i = 0; i < matches.length; i += 2) {
        if (i + 1 < matches.length) {
          // 检查第i场和第i+1场之间的冲突
          const match1 = matches[i];      // 第1场、第3场、第5场...
          const match2 = matches[i + 1];  // 第2场、第4场、第6场...
          const conflictScore = this.calculateConflictScore(match1, match2);
          totalConflicts += conflictScore;
        }
      }
    } else {
      // 其他场地数量：检测所有相邻场次的冲突
      for (let i = 1; i < matches.length; i++) {
        const conflictScore = this.calculateConflictScore(matches[i - 1], matches[i]);
        totalConflicts += conflictScore;
      }
    }

    return totalConflicts;
  },

  // 计算两场比赛之间的冲突分数（重复选手数量）
  calculateConflictScore: function (match1, match2) {
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

  // 获取冲突的选手列表
  getConflictingPlayers: function (match1, match2) {
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

    const conflictingPlayers = [];
    for (const player of players1) {
      if (players2.has(player)) {
        conflictingPlayers.push(player);
      }
    }
    return conflictingPlayers;
  },

  // 生成组合
  generateCombinations: function (arr, r) {
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
  hasIntersection: function (set1, set2) {
    for (const item of set1) {
      if (set2.has(item)) {
        return true;
      }
    }
    return false;
  },

  // 获取配对键
  getPairKey: function (pair) {
    return pair.sort().join(',');
  },

  // 打乱数组
  shuffleArray: function (array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  },

  // 计算每个选手参与的比赛次数
  calculatePlayerCounts: function (matches) {
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
  calculateByeCounts: function (matches) {
    return {};
  },

  // 计算搜索空间大小
  calculateSearchSpace: function (validMatchesCount, n, playerCount) {
    // 计算组合数 C(validMatchesCount, n)
    let combinations = 1;
    for (let i = 0; i < n; i++) {
      combinations *= (validMatchesCount - i);
    }
    for (let i = 1; i <= n; i++) {
      combinations /= i;
    }
    
    // 考虑状态空间：每个选手最多出现的次数
    const maxPlayerCount = n * 4 / playerCount;
    const stateSpace = Math.pow(maxPlayerCount + 1, playerCount);
    
    return combinations * stateSpace;
  },

  // 计算组合数 C(m, n)
  calculateCombinations: function (m, n) {
    if (n > m) return 0;
    if (n === 0 || n === m) return 1;
    
    // 使用更稳定的计算方法
    let result = 1;
    const k = Math.min(n, m - n);
    
    for (let i = 0; i < k; i++) {
      result = result * (m - i) / (i + 1);
    }
    
    return Math.floor(result);
  },

  // ========== 动态规划算法相关函数 ==========

  // 根据问题规模选择算法（优化版）
  selectAlgorithmForDP: function (quadCount, n, r) {
    // 计算状态空间大小估计
    const stateSpaceSize = Math.pow(r + 1, n);
    
    // 算法选择策略（更智能）
    if (quadCount <= 30 && stateSpaceSize <= 500000) { // 小规模问题
      return 'dp';
    } else if (quadCount <= 60 && stateSpaceSize <= 5000000) { // 中等规模问题
      return 'heuristic';
    } else { // 大规模问题，状态空间爆炸
      return 'random';
    }
  },

  // 预计算每个四元组对每个元素的贡献
  precomputeContributions: function (S4, n, playerList) {
    const contributions = [];
    for (const quad of S4) {
      const contribution = new Array(n).fill(0);
      // 将四元组转换为选手索引
      const players = [...quad.pair1, ...quad.pair2];
      
      // 根据选手名称在playerList中的位置确定索引
      players.forEach(player => {
        const index = playerList.indexOf(player);
        if (index >= 0 && index < n) {
          contribution[index]++;
        }
      });
      contributions.push(contribution);
    }
    return contributions;
  },

  // 随机采样算法（优化版）
  solveQuadrupleSelectionRandom: function (S4, n, r, j, playerList, maxAttempts = null) {
    const m = S4.length;
    
    // 智能计算尝试次数
    if (maxAttempts === null) {
      const stateSpaceSize = Math.pow(r + 1, n);
      const combinationCount = this.calculateCombinations(m, j);
      
      // 基础尝试次数
      let baseAttempts = 1000;
      
      // 根据状态空间大小调整（指数增长）
      if (stateSpaceSize <= 1000000) {
        baseAttempts = 2000; // 小状态空间
      } else if (stateSpaceSize <= 10000000) {
        baseAttempts = 8000; // 中等状态空间
      } else if (stateSpaceSize <= 100000000) {
        baseAttempts = 25000; // 大状态空间
      } else if (stateSpaceSize <= 1000000000) {
        baseAttempts = 60000; // 超大状态空间
      } else {
        baseAttempts = 120000; // 极大状态空间
      }
      
      // 根据组合数调整（对数增长）
      const combinationFactor = Math.min(Math.log10(combinationCount) + 1, 8); // 最多8倍
      maxAttempts = Math.floor(baseAttempts * combinationFactor);
      
      // 根据问题难度调整（r值越大，问题越难）
      const difficultyFactor = Math.min(r / 5, 3); // r=5时1倍，r=15时3倍
      maxAttempts = Math.floor(maxAttempts * difficultyFactor);
      
      // 设置合理的上下限
      maxAttempts = Math.max(1000, Math.min(maxAttempts, 500000));
      
      console.log(`智能计算尝试次数:`);
      console.log(`  状态空间: ${stateSpaceSize.toLocaleString()}`);
      console.log(`  组合数: ${combinationCount.toLocaleString()}`);
      console.log(`  目标出现次数: ${r}`);
      console.log(`  最终尝试次数: ${maxAttempts.toLocaleString()}`);
    }
    
    // 内联预计算每个四元组对每个元素的贡献，避免this上下文问题
    const contributions = [];
    for (const quad of S4) {
      const contribution = new Array(n).fill(0);
      const players = [...quad.pair1, ...quad.pair2];
      
      players.forEach(player => {
        const index = playerList.indexOf(player);
        if (index >= 0 && index < n) {
          contribution[index]++;
        }
      });
      contributions.push(contribution);
    }
    
    const evaluateSolution = (selectedQuads) => {
      const state = new Array(n).fill(0);
      for (const quadIdx of selectedQuads) {
        const contribution = contributions[quadIdx];
        for (let i = 0; i < n; i++) {
          state[i] += contribution[i];
        }
      }
      
      // 计算与目标的差距
      let totalGap = 0;
      for (let i = 0; i < n; i++) {
        totalGap += Math.abs(r - state[i]);
      }
      
      return { gap: totalGap, state: state };
    };
    
    // 贪心初始化：选择能让元素分布更均匀的四元组
    const greedyInitialize = () => {
      const selectedQuads = [];
      const currentState = new Array(n).fill(0);
      
      for (let step = 0; step < j; step++) {
        let bestQuad = -1;
        let bestScore = -Infinity;
        
        for (let quadIdx = 0; quadIdx < m; quadIdx++) {
          if (selectedQuads.includes(quadIdx)) continue;
          
          // 临时添加这个四元组
          const tempState = [...currentState];
          const contribution = contributions[quadIdx];
          for (let i = 0; i < n; i++) {
            tempState[i] += contribution[i];
          }
          
          // 检查是否超过目标
          if (tempState.some(count => count > r)) continue;
          
          // 计算评分：优先选择能让元素分布更均匀的
          let score = 0;
          for (let i = 0; i < n; i++) {
            if (tempState[i] <= r) {
              score += (r - tempState[i]) * 10; // 优先选择能让元素更接近目标的
            }
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestQuad = quadIdx;
          }
        }
        
        if (bestQuad >= 0) {
          selectedQuads.push(bestQuad);
          const contribution = contributions[bestQuad];
          for (let i = 0; i < n; i++) {
            currentState[i] += contribution[i];
          }
        } else {
          break; // 无法找到合适的四元组
        }
      }
      
      return selectedQuads;
    };
    
    // 局部优化：尝试替换四元组来改善解
    const localOptimize = (selectedQuads) => {
      let improved = true;
      let iterations = 0;
      const maxIterations = 100;
      
      while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;
        
        for (let i = 0; i < selectedQuads.length; i++) {
          for (let newQuad = 0; newQuad < m; newQuad++) {
            if (selectedQuads.includes(newQuad)) continue;
            
            // 尝试替换
            const tempQuads = [...selectedQuads];
            tempQuads[i] = newQuad;
            
            const currentGap = evaluateSolution(selectedQuads).gap;
            const newGap = evaluateSolution(tempQuads).gap;
            
            if (newGap < currentGap) {
              selectedQuads.splice(0, selectedQuads.length, ...tempQuads);
              improved = true;
              
              if (newGap === 0) {
                return true; // 找到完美解
              }
              break;
            }
          }
          if (improved) break;
        }
      }
      
      return false; // 没有找到完美解
    };
    
    // 主搜索循环
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 每10%进度更新一次提示
      if (attempt % Math.max(1, Math.floor(maxAttempts / 10)) === 0) {
        this.updateProgress('随机采样算法', '搜索中', attempt, maxAttempts);
      }
      
      // 贪心初始化
      let selectedQuads = greedyInitialize();
      
      if (selectedQuads.length === j) {
        // 评估初始解
        const { gap } = evaluateSolution(selectedQuads);
        
        if (gap === 0) {
          return selectedQuads; // 贪心初始化就找到了完美解
        }
        
        // 局部优化
        if (localOptimize(selectedQuads)) {
          return selectedQuads; // 局部优化找到了完美解
        }
        
        // 检查当前解是否足够好
        const finalGap = evaluateSolution(selectedQuads).gap;
        if (finalGap <= 2) { // 允许2个元素的误差
          console.log(`找到近似解，差距: ${finalGap}`);
          return selectedQuads;
        }
      }
      
      // 如果贪心初始化失败，尝试完全随机
      if (attempt % 100 === 0) { // 每100次尝试一次完全随机
        const available = [...Array(m).keys()];
        for (let i = available.length - 1; i > 0; i--) {
          const randomIndex = Math.floor(Math.random() * (i + 1));
          [available[i], available[randomIndex]] = [available[randomIndex], available[i]];
        }
        selectedQuads = available.slice(0, j);
        
        const { gap } = evaluateSolution(selectedQuads);
        if (gap === 0) {
          return selectedQuads;
        }
      }
    }
    
    return null;
  },

  // 启发式搜索算法（优化版）
  solveQuadrupleSelectionHeuristic: function (S4, n, r, j, playerList, maxIterations = null) {
    const m = S4.length;
    
    // 智能计算最大迭代次数
    if (maxIterations === null) {
      const stateSpaceSize = Math.pow(r + 1, n);
      
      // 启发式搜索的迭代次数通常比随机采样少，但更精确
      if (stateSpaceSize <= 1000000) {
        maxIterations = 1000; // 小状态空间
      } else if (stateSpaceSize <= 10000000) {
        maxIterations = 3000; // 中等状态空间
      } else if (stateSpaceSize <= 100000000) {
        maxIterations = 8000; // 大状态空间
      } else {
        maxIterations = 15000; // 超大状态空间
      }
      
      // 根据问题难度调整
      const difficultyFactor = Math.min(r / 5, 2); // r=5时1倍，r=10时2倍
      maxIterations = Math.floor(maxIterations * difficultyFactor);
      
      // 设置合理的上下限
      maxIterations = Math.max(500, Math.min(maxIterations, 50000));
      
      console.log(`启发式搜索最大迭代次数: ${maxIterations.toLocaleString()}`);
    }
    
    // 内联预计算每个四元组对每个元素的贡献，避免this上下文问题
    const contributions = [];
    for (const quad of S4) {
      const contribution = new Array(n).fill(0);
      const players = [...quad.pair1, ...quad.pair2];
      
      players.forEach(player => {
        const index = playerList.indexOf(player);
        if (index >= 0 && index < n) {
          contribution[index]++;
        }
      });
      contributions.push(contribution);
    }
    
    const evaluateQuad = (quadIdx, currentState) => {
      const contribution = contributions[quadIdx];
      const newState = [...currentState];
      
      for (let i = 0; i < n; i++) {
        newState[i] += contribution[i];
      }
      
      let totalGap = 0;
      for (let i = 0; i < n; i++) {
        if (newState[i] > r) {
          return -Infinity;
        }
        totalGap += r - newState[i];
      }
      
      return -totalGap;
    };
    
    const searchSolution = (currentState, selectedQuads, remainingQuads, depth = 0) => {
      if (selectedQuads.length === j) {
        if (currentState.every(count => count === r)) {
          return selectedQuads;
        }
        return null;
      }
      
      if (selectedQuads.length + remainingQuads.length < j) {
        return null;
      }
      
      // 每10层深度更新一次进度提示
      if (depth % 10 === 0) {
        const currentStep = selectedQuads.length;
        this.updateProgress('启发式搜索', `深度${depth}层`, currentStep, j);
      }
      
      const candidates = [];
      for (const quadIdx of remainingQuads) {
        const score = evaluateQuad(quadIdx, currentState);
        if (score > -Infinity) {
          candidates.push([score, quadIdx]);
        }
      }
      
      candidates.sort((a, b) => b[0] - a[0]);
      
      for (let ci = 0; ci < candidates.length; ci++) {
        const score = candidates[ci][0];
        const quadIdx = candidates[ci][1];
        const contribution = contributions[quadIdx];
        const newState = [...currentState];
        for (let i = 0; i < n; i++) {
          newState[i] += contribution[i];
        }
        
        const newRemaining = remainingQuads.filter(q => q !== quadIdx);
        const result = searchSolution(newState, [...selectedQuads, quadIdx], newRemaining, depth + 1);
        if (result) {
          return result;
        }
      }
      
      return null;
    };
    
    const initialState = new Array(n).fill(0);
    const allQuads = [...Array(m).keys()];
    
    return searchSolution(initialState, [], allQuads);
  },

  // 动态规划算法（简化版，主要用于小规模问题）
  solveQuadrupleSelectionDP: function (S4, n, r, j, playerList) {
    // 对于小规模问题，使用启发式搜索作为替代
    // 因为完整的动态规划在JavaScript中实现复杂且效率不高
    console.log('使用启发式搜索替代动态规划...');
    return this.solveQuadrupleSelectionHeuristic(S4, n, r, j, playerList);
  }
}); 
