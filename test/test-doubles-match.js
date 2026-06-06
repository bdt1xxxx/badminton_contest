// 模块测试：双打对阵生成
// 输入：12人，2块场地，双打
// 运行方式：node test/test-doubles-match.js

const players = [
  { name: '国栋', score: 4.5 },
  { name: '杭天', score: 3.5 },
  { name: '蔡晓峰', score: 4 },
  { name: '常会鑫', score: 3.5 },
  { name: '闫铭', score: 3.5 },
  { name: '刘戈', score: 2.5 },
  { name: '孙江月', score: 2.5 },
  { name: '罗妹秋', score: 2.5 },
  { name: '许潇民', score: 2.5 },
  { name: '米京', score: 2 },
  { name: '小尼', score: 2 },
  { name: '于红', score: 2.5 },
];

const config = {
  matchType: '双打',
  maxPlayers: 12,
  courtCount: 2,
  levelGap: 0.5,
  selectedRounds: 24, // Math.round(4 * 12 / 4)
};

// ===== 从 create-match.js 提取的算法（去掉 wx 依赖） =====

const module = {
  data: {
    players,
    selectedRounds: config.selectedRounds,
    levelGap: config.levelGap,
    courtCount: config.courtCount,
  },

  showTips: function (title) {
    console.log('[tip]', title);
  },

  sleep: function () {},

  generateDoublesMatches: function () {
    const players = this.data.players;
    const numPlayers = players.length;
    const numMatches = this.data.selectedRounds;
    const levelGap = this.data.levelGap;

    if (numPlayers < 4) throw new Error('至少需要4名选手才能生成对阵');

    const playersObj = {};
    players.forEach(p => { playersObj[p.name] = parseFloat(p.score); });

    if (numMatches <= 0) throw new Error('对阵场数必须大于0');
    if (levelGap < 0) throw new Error('等级差不能为负数');

    const playerList = Object.keys(playersObj);
    const pairs = this.generatePlayerPairs(playerList);
    const validMatches = this.generateValidMatches(pairs, playersObj, levelGap);
    return this.selectMatchesByStrategy(validMatches, numMatches, playerList, playersObj);
  },

  generatePlayerPairs: function (playerList) {
    const pairs = this.generateCombinations(playerList, 2);
    this.showTips(`生成${pairs.length}个2人组合`);
    return pairs;
  },

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
    if (validMatches.length === 0) throw new Error(`没有找到满足等级差限制(${levelGap})的对战组合`);
    return validMatches;
  },

  selectMatchesByStrategy: function (validMatches, numMatches, playerList, playersObj) {
    const strategies = [
      { name: '回溯法(MRV)', method: 'selectBalancedMatchesBackTraceMRV', toast: '回溯法(MRV)未找到，尝试暴力法' },
      { name: '暴力法', method: 'selectBalancedMatches', toast: '无法找到符合要求的对战组合' }
    ];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      console.log(`\n=== 尝试策略${i + 1}: ${strategy.name} ===`);
      try {
        const result = this[strategy.method](validMatches, numMatches, playerList, playersObj);
        if (result) {
          console.log(`✅ ${strategy.name}成功生成对阵！`);
          return result;
        }
        if (i < strategies.length - 1) console.log(`❌ ${strategy.name}失败，尝试下一个策略`);
      } catch (error) {
        console.error(`${strategy.name}执行出错:`, error.message);
      }
    }
    throw new Error('所有对阵生成策略都失败了');
  },

  selectBalancedMatchesBackTraceMRV: function (validMatches, n, playerList, players) {
    const P = playerList.length;
    if ((n * 4) % P !== 0) { console.log('每人出场次数不是整数，无解'); return null; }
    const targetCount = (n * 4) / P;
    console.log(`目标：每个选手出场${targetCount}次`);

    const idxOf = {};
    for (let i = 0; i < P; i++) idxOf[playerList[i]] = i;

    const M = validMatches.length;
    const matchPlayers = new Array(M);
    for (let i = 0; i < M; i++) {
      const m = validMatches[i];
      matchPlayers[i] = [idxOf[m.pair1[0]], idxOf[m.pair1[1]], idxOf[m.pair2[0]], idxOf[m.pair2[1]]];
    }

    const matchesByPlayer = Array.from({ length: P }, () => []);
    for (let i = 0; i < M; i++) {
      const ps = matchPlayers[i];
      matchesByPlayer[ps[0]].push(i);
      matchesByPlayer[ps[1]].push(i);
      matchesByPlayer[ps[2]].push(i);
      matchesByPlayer[ps[3]].push(i);
    }

    const counts = new Array(P).fill(0);
    const supply = matchesByPlayer.map(a => a.length);
    const used = new Uint8Array(M);
    const excluded = new Uint8Array(M);
    const selected = [];

    const startTime = Date.now();
    const TIME_LIMIT = 10000;
    const STEP_LIMIT = 200000;
    let steps = 0;
    let timedOut = false;

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
    const pickMatch = (i) => {
      used[i] = 1; excluded[i] = 1;
      const ps = matchPlayers[i];
      counts[ps[0]]++; counts[ps[1]]++; counts[ps[2]]++; counts[ps[3]]++;
      supply[ps[0]]--; supply[ps[1]]--; supply[ps[2]]--; supply[ps[3]]--;
      selected.push(i);
    };
    const unpickMatch = (i) => {
      used[i] = 0; excluded[i] = 0;
      const ps = matchPlayers[i];
      counts[ps[0]]--; counts[ps[1]]--; counts[ps[2]]--; counts[ps[3]]--;
      supply[ps[0]]++; supply[ps[1]]++; supply[ps[2]]++; supply[ps[3]]++;
      selected.pop();
    };

    const feasible = () => {
      for (let p = 0; p < P; p++) {
        if (counts[p] > targetCount) return false;
        if (supply[p] < targetCount - counts[p]) return false;
      }
      return true;
    };

    const pickBranchPlayer = () => {
      let best = -1, bestNeed = -1, bestSupply = Infinity;
      for (let p = 0; p < P; p++) {
        const need = targetCount - counts[p];
        if (need <= 0) continue;
        if (need > bestNeed || (need === bestNeed && supply[p] < bestSupply)) {
          best = p; bestNeed = need; bestSupply = supply[p];
        }
      }
      return best;
    };

    const search = () => {
      if (++steps > STEP_LIMIT) { timedOut = true; return false; }
      if ((steps & 1023) === 0 && Date.now() - startTime > TIME_LIMIT) { timedOut = true; return false; }
      if (selected.length === n) {
        for (let p = 0; p < P; p++) if (counts[p] !== targetCount) return false;
        return true;
      }
      if (!feasible()) return false;
      const p = pickBranchPlayer();
      if (p === -1) return false;

      const candidates = matchesByPlayer[p];
      const ordered = [];
      for (let k = 0; k < candidates.length; k++) {
        const i = candidates[k];
        if (used[i] || excluded[i]) continue;
        const ps = matchPlayers[i];
        const score = counts[ps[0]] + counts[ps[1]] + counts[ps[2]] + counts[ps[3]];
        ordered.push({ i, score });
      }
      ordered.sort((a, b) => a.score - b.score);

      for (let k = 0; k < ordered.length; k++) {
        const i = ordered[k].i;
        pickMatch(i);
        if (search()) return true;
        unpickMatch(i);
        if (timedOut) return false;
        excludeMatch(i);
      }
      for (let k = 0; k < ordered.length; k++) {
        const i = ordered[k].i;
        if (excluded[i] && !used[i]) restoreMatch(i);
      }
      return false;
    };

    const ok = search();
    console.log(`MRV 回溯结束：steps=${steps}, 耗时=${Date.now() - startTime}ms, ok=${ok}, timedOut=${timedOut}`);
    if (!ok) return null;

    const matches = selected.map(i => validMatches[i]);
    const playerCounts = {};
    for (let p = 0; p < P; p++) playerCounts[playerList[p]] = counts[p];
    return this.formatMatches(matches, playerCounts, players);
  },

  selectBalancedMatches: function (validMatches, n, playerList, players) {
    const maxAttempts = 10000;
    let attempts = 0;
    while (attempts < maxAttempts) {
      this.shuffleArray(validMatches);
      const selectedMatches = [];
      const playerCounts = {};
      playerList.forEach(p => { playerCounts[p] = 0; });

      for (const match of validMatches) {
        if (selectedMatches.length >= n) break;
        const tempCounts = { ...playerCounts };
        const matchPlayers = [...match.pair1, ...match.pair2];
        matchPlayers.forEach(p => { tempCounts[p]++; });
        const counts = Object.values(tempCounts);
        if (Math.max(...counts) - Math.min(...counts) <= 2) {
          selectedMatches.push(match);
          Object.keys(tempCounts).forEach(k => { playerCounts[k] = tempCounts[k]; });
        }
      }

      if (selectedMatches.length === n) {
        const counts = Object.values(playerCounts);
        if (counts.every(c => c === counts[0])) {
          console.log('找到满足条件的对战组合！所有选手出场次数相等');
          return this.formatMatches(selectedMatches, playerCounts, players);
        }
      }
      attempts++;
    }
    throw new Error(`在${maxAttempts}次尝试后仍无法找到满足完全相等条件的${n}组对战`);
  },

  formatMatches: function (matches, playerCounts, players) {
    const result = [];
    matches.forEach((match, index) => {
      result.push({
        id: index + 1,
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
      });
    });

    const optimizedResult = this.optimizeMatchSequence(result);
    return { matches: optimizedResult, playerCounts };
  },

  optimizeMatchSequence: function (matches) {
    if (matches.length <= 1) return matches;
    const maxAttempts = 10;
    let bestResult = null;
    let bestConflictCount = Infinity;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = this.attemptOptimization(matches);
      const totalConflicts = this.calculateTotalConflicts(result);
      if (totalConflicts === 0) { this.renumberMatches(result); return result; }
      if (totalConflicts < bestConflictCount) { bestConflictCount = totalConflicts; bestResult = result; }
      if (totalConflicts <= 1) {
        this.renumberMatches(result);
        const reordered = this.reorderMatchesByConflict(result);
        this.renumberMatches(reordered);
        return reordered;
      }
    }

    this.renumberMatches(bestResult);
    bestResult = this.reorderMatchesByConflict(bestResult);
    this.renumberMatches(bestResult);
    return bestResult;
  },

  renumberMatches: function (matches) {
    matches.forEach((m, i) => { m.id = i + 1; });
  },

  attemptOptimization: function (matches) {
    const result = [matches[0]];
    let remaining = [...matches.slice(1)];
    while (remaining.length > 0) {
      let bestNextIndex = -1, bestScore = -1;
      for (let i = 0; i < remaining.length; i++) {
        const score = 4 - this.calculateConflictScore(result[result.length - 1], remaining[i]);
        if (score > bestScore) { bestScore = score; bestNextIndex = i; }
      }
      result.push(remaining.splice(bestNextIndex, 1)[0]);
    }
    return result;
  },

  calculateTotalConflicts: function (matches) {
    let totalConflicts = 0;
    const courtCount = this.data.courtCount;
    for (let i = 0; i < matches.length; i += courtCount) {
      const batch = matches.slice(i, i + courtCount);
      for (let a = 0; a < batch.length; a++) {
        for (let b = a + 1; b < batch.length; b++) {
          totalConflicts += this.calculateConflictScore(batch[a], batch[b]);
        }
      }
    }
    return totalConflicts;
  },

  reorderMatchesByConflict: function (matches) {
    const courtCount = this.data.courtCount;
    const nonConflictMatches = [];
    const conflictMatches = [];
    for (let i = 0; i < matches.length; i += courtCount) {
      const batch = matches.slice(i, i + courtCount);
      let batchHasConflict = false;
      for (let a = 0; a < batch.length && !batchHasConflict; a++) {
        for (let b = a + 1; b < batch.length && !batchHasConflict; b++) {
          if (this.calculateConflictScore(batch[a], batch[b]) > 0) batchHasConflict = true;
        }
      }
      if (batchHasConflict) {
        for (let a = 0; a < batch.length; a++) {
          for (let b = a + 1; b < batch.length; b++) {
            const score = this.calculateConflictScore(batch[a], batch[b]);
            if (score > 0) {
              batch[a].hasConflict = true; batch[a].conflictWith = batch[b].id; batch[a].conflictScore = score;
              batch[b].hasConflict = true; batch[b].conflictWith = batch[a].id; batch[b].conflictScore = score;
            }
          }
          conflictMatches.push(batch[a]);
        }
      } else {
        for (const m of batch) nonConflictMatches.push(m);
      }
    }
    return [...nonConflictMatches, ...conflictMatches];
  },

  calculateConflictScore: function (match1, match2) {
    const p1 = new Set([match1.team1.player1.name, match1.team1.player2.name, match1.team2.player1.name, match1.team2.player2.name]);
    const p2 = new Set([match2.team1.player1.name, match2.team1.player2.name, match2.team2.player1.name, match2.team2.player2.name]);
    let conflicts = 0;
    for (const p of p1) { if (p2.has(p)) conflicts++; }
    return conflicts;
  },

  getConflictingPlayers: function (match1, match2) {
    const p1 = new Set([match1.team1.player1.name, match1.team1.player2.name, match1.team2.player1.name, match1.team2.player2.name]);
    const p2 = new Set([match2.team1.player1.name, match2.team1.player2.name, match2.team2.player1.name, match2.team2.player2.name]);
    return [...p1].filter(p => p2.has(p));
  },

  generateCombinations: function (arr, r) {
    const combinations = [];
    function backtrack(start, combo) {
      if (combo.length === r) { combinations.push([...combo]); return; }
      for (let i = start; i < arr.length; i++) { combo.push(arr[i]); backtrack(i + 1, combo); combo.pop(); }
    }
    backtrack(0, []);
    return combinations;
  },

  shuffleArray: function (array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  },
};

// ===== 运行测试 =====

console.log('='.repeat(60));
console.log('测试输入:');
console.log(`  比赛类型: ${config.matchType}`);
console.log(`  参赛人数: ${config.maxPlayers}`);
console.log(`  场地数量: ${config.courtCount}`);
console.log(`  组间等级差距: ${config.levelGap}`);
console.log(`  比赛局数: ${config.selectedRounds}`);
console.log('='.repeat(60));

try {
  const result = module.generateDoublesMatches();
  const { matches, playerCounts } = result;

  console.log('\n' + '='.repeat(60));
  console.log(`比赛序列（共 ${matches.length} 场）:`);
  console.log('='.repeat(60));

  for (let i = 0; i < matches.length; i += config.courtCount) {
    const batch = matches.slice(i, i + config.courtCount);
    console.log(`\n【第 ${Math.floor(i / config.courtCount) + 1} 轮】`);
    batch.forEach(m => {
      const conflict = m.hasConflict ? ' ⚠️冲突' : '';
      console.log(
        `  场次${m.id}: (${m.team1.player1.name}+${m.team1.player2.name}) ${m.team1.levelSum.toFixed(1)}` +
        ` vs ` +
        `${m.team2.levelSum.toFixed(1)} (${m.team2.player1.name}+${m.team2.player2.name})` +
        ` 差:${m.levelDiff.toFixed(1)}${conflict}`
      );
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('选手出场统计:');
  Object.entries(playerCounts).forEach(([name, count]) => {
    console.log(`  ${name}: ${count}场`);
  });

  const counts = Object.values(playerCounts);
  const allEqual = counts.every(c => c === counts[0]);
  const totalConflicts = module.calculateTotalConflicts(matches);
  console.log('\n' + '='.repeat(60));
  console.log(`出场次数是否均等: ${allEqual ? '✅ 是' : '❌ 否'}`);
  console.log(`同轮次冲突数: ${totalConflicts === 0 ? '✅ 0' : `⚠️ ${totalConflicts}`}`);

} catch (err) {
  console.error('\n❌ 测试失败:', err.message);
  process.exit(1);
}
