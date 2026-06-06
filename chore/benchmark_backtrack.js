/**
 * 性能测试：selectBalancedMatchesBackTraceMRV vs selectBalancedMatchesBackTrace
 *
 * 测试参数：
 *   - 12名选手（6名score=4，6名score=2）
 *   - levelGap = 0（双方总分必须完全相等）
 *   - numMatches = 12（每人出场4次，整除检查通过）
 */

'use strict';

// ─────────────────────────────────────────────
// 公共工具函数（从 create-match.js 提取）
// ─────────────────────────────────────────────

function generateCombinations(arr, r) {
  const combinations = [];
  function backtrack(start, combo) {
    if (combo.length === r) { combinations.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1, combo);
      combo.pop();
    }
  }
  backtrack(0, []);
  return combinations;
}

function generateValidMatches(playerList, playersObj, levelGap) {
  const pairs = generateCombinations(playerList, 2);
  const validMatches = [];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const pair1 = pairs[i], pair2 = pairs[j];
      if (new Set([...pair1, ...pair2]).size !== 4) continue;
      const level1 = playersObj[pair1[0]] + playersObj[pair1[1]];
      const level2 = playersObj[pair2[0]] + playersObj[pair2[1]];
      if (Math.abs(level1 - level2) <= levelGap) {
        validMatches.push({ pair1, pair2, level1, level2, levelDiff: Math.abs(level1 - level2) });
      }
    }
  }
  return validMatches;
}

function calculateSearchSpace(validMatchesCount, n, playerCount) {
  let combinations = 1;
  for (let i = 0; i < n; i++) combinations *= (validMatchesCount - i);
  for (let i = 1; i <= n; i++) combinations /= i;
  const maxPlayerCount = (n * 4) / playerCount;
  return combinations * Math.pow(maxPlayerCount + 1, playerCount);
}

// ─────────────────────────────────────────────
// 算法 A：原始回溯法（含指标采集）
// ─────────────────────────────────────────────

function selectBalancedMatchesBackTrace(validMatches, n, playerList) {
  const metrics = {
    name: '回溯法（原始）',
    startTime: 0,
    endTime: 0,
    wallTimeMs: 0,
    recursiveCalls: 0,
    prunesByOverflow: 0,    // 出场次数超出目标而剪枝的次数
    prunesByReach: 0,       // canReachTarget 判断不可达而剪枝的次数
    nodesExplored: 0,       // 实际扩展的节点数（每次尝试一条新对阵）
    maxDepthReached: 0,
    timedOut: false,
    searchSpaceSkip: false,
    result: null,
  };

  const searchSpace = calculateSearchSpace(validMatches.length, n, playerList.length);
  // 注意：移除了搜索空间跳过逻辑，强制执行搜索
  metrics.searchSpaceSkip = false;

  const targetCount = (n * 4) / playerList.length;
  const playerCounts = {};
  playerList.forEach(p => { playerCounts[p] = 0; });

  const startTime = Date.now();
  const TIMEOUT = 10_000;

  function canReachTarget(counts, remaining) {
    const vals = Object.values(counts);
    const maxVal = Math.max(...vals);
    if (maxVal - Math.min(...vals) > remaining * 2) return false;
    for (const c of vals) {
      if (c > targetCount + remaining) return false;
    }
    return true;
  }

  function backtrack(counts, selected, startIdx, depth) {
    metrics.recursiveCalls++;
    if (depth > metrics.maxDepthReached) metrics.maxDepthReached = depth;

    if (Date.now() - startTime > TIMEOUT) { metrics.timedOut = true; return null; }

    if (selected.length >= n) {
      const vals = Object.values(counts);
      const first = vals[0];
      return vals.every(v => v === first) ? { matches: [...selected], playerCounts: { ...counts } } : null;
    }

    if (!canReachTarget(counts, n - selected.length)) { metrics.prunesByReach++; return null; }

    for (const p of playerList) {
      if (counts[p] > targetCount) { metrics.prunesByOverflow++; return null; }
    }

    for (let i = startIdx; i < validMatches.length; i++) {
      const match = validMatches[i];
      const matchPlayers = [...match.pair1, ...match.pair2];
      const tempCounts = { ...counts };
      matchPlayers.forEach(p => { tempCounts[p]++; });

      let valid = true;
      for (const p of playerList) {
        if (tempCounts[p] > targetCount) { valid = false; break; }
      }

      if (valid) {
        metrics.nodesExplored++;
        const result = backtrack(tempCounts, [...selected, match], i + 1, depth + 1);
        if (result) return result;
        if (metrics.timedOut) return null;
      }
    }
    return null;
  }

  metrics.startTime = Date.now();
  const result = backtrack(playerCounts, [], 0, 0);
  metrics.endTime = Date.now();
  metrics.wallTimeMs = metrics.endTime - metrics.startTime;
  metrics.result = result ? 'SUCCESS' : (metrics.timedOut ? 'TIMEOUT' : 'NO_SOLUTION');
  metrics.matches = result ? result.matches : null;
  metrics.playerCounts = result ? result.playerCounts : null;
  return metrics;
}

// ─────────────────────────────────────────────
// 算法 B：MRV 回溯法（含指标采集）
// ─────────────────────────────────────────────

function selectBalancedMatchesBackTraceMRV(validMatches, n, playerList) {
  const metrics = {
    name: '回溯法（MRV优化）',
    startTime: 0,
    endTime: 0,
    wallTimeMs: 0,
    recursiveCalls: 0,       // search() 调用次数（等价于 steps）
    feasibilityPrunes: 0,    // feasible() 判定失败的剪枝次数
    candidatesSorted: 0,     // 子节点排序次数（每次进入有效分支时）
    maxDepthReached: 0,
    timedOut: false,
    result: null,
  };

  const P = playerList.length;
  if ((n * 4) % P !== 0) { metrics.result = 'NO_SOLUTION'; return metrics; }

  const targetCount = (n * 4) / P;
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
    matchPlayers[i].forEach(pi => matchesByPlayer[pi].push(i));
  }

  const counts = new Array(P).fill(0);
  const supply = matchesByPlayer.map(a => a.length);
  const used = new Uint8Array(M);
  const excluded = new Uint8Array(M);
  const selected = [];

  const TIME_LIMIT = 10_000;
  const STEP_LIMIT = 200_000;
  let steps = 0;
  let timedOut = false;
  const startTime = Date.now();

  const excludeMatch = i => { excluded[i] = 1; matchPlayers[i].forEach(p => supply[p]--); };
  const restoreMatch = i => { excluded[i] = 0; matchPlayers[i].forEach(p => supply[p]++); };
  const pickMatch = i => {
    used[i] = 1; excluded[i] = 1;
    matchPlayers[i].forEach(p => { counts[p]++; supply[p]--; });
    selected.push(i);
  };
  const unpickMatch = i => {
    used[i] = 0; excluded[i] = 0;
    matchPlayers[i].forEach(p => { counts[p]--; supply[p]++; });
    selected.pop();
  };

  const feasible = () => {
    for (let p = 0; p < P; p++) {
      if (counts[p] > targetCount || supply[p] < targetCount - counts[p]) return false;
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

  function search(depth) {
    metrics.recursiveCalls++;
    if (depth > metrics.maxDepthReached) metrics.maxDepthReached = depth;

    if (++steps > STEP_LIMIT) { timedOut = true; return false; }
    if ((steps & 1023) === 0 && Date.now() - startTime > TIME_LIMIT) { timedOut = true; return false; }

    if (selected.length === n) {
      for (let p = 0; p < P; p++) if (counts[p] !== targetCount) return false;
      return true;
    }

    if (!feasible()) { metrics.feasibilityPrunes++; return false; }

    const p = pickBranchPlayer();
    if (p === -1) return false;

    const ordered = [];
    for (const i of matchesByPlayer[p]) {
      if (used[i] || excluded[i]) continue;
      const ps = matchPlayers[i];
      ordered.push({ i, score: counts[ps[0]] + counts[ps[1]] + counts[ps[2]] + counts[ps[3]] });
    }
    ordered.sort((a, b) => a.score - b.score);
    metrics.candidatesSorted++;

    for (const { i } of ordered) {
      pickMatch(i);
      if (search(depth + 1)) return true;
      unpickMatch(i);
      if (timedOut) return false;
      excludeMatch(i);
    }
    for (const { i } of ordered) {
      if (excluded[i] && !used[i]) restoreMatch(i);
    }
    return false;
  }

  metrics.startTime = Date.now();
  const ok = search(0);
  metrics.endTime = Date.now();
  metrics.wallTimeMs = metrics.endTime - metrics.startTime;
  metrics.timedOut = timedOut;
  metrics.result = ok ? 'SUCCESS' : (timedOut ? 'TIMEOUT' : 'NO_SOLUTION');
  if (ok) {
    metrics.matches = selected.map(i => validMatches[i]);
    const pc = {};
    for (let p = 0; p < P; p++) pc[playerList[p]] = counts[p];
    metrics.playerCounts = pc;
  } else {
    metrics.matches = null;
    metrics.playerCounts = null;
  }
  return metrics;
}

// ─────────────────────────────────────────────
// 测试入口
// ─────────────────────────────────────────────

function runBenchmark() {
  // 构造测试数据
  const playerList = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6',  // score = 4
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',  // score = 2
  ];
  const playersObj = {};
  playerList.forEach(p => { playersObj[p] = p.startsWith('A') ? 4 : 2; });

  const levelGap = 0;
  const numMatches = 12; // (12 * 4) % 12 === 0, targetCount = 4

  console.log('═══════════════════════════════════════════════════════');
  console.log('  羽毛球对阵算法性能对比测试');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  选手数量  : ${playerList.length} (A1-A6: score=4, B1-B6: score=2)`);
  console.log(`  目标场次  : ${numMatches} 场`);
  console.log(`  等级差限制: ${levelGap}`);
  console.log(`  每人出场次: ${(numMatches * 4) / playerList.length} 次`);
  console.log('');

  // 生成有效对阵
  console.log('生成有效对阵中...');
  const t0 = Date.now();
  const validMatches = generateValidMatches(playerList, playersObj, levelGap);
  const genMs = Date.now() - t0;
  console.log(`  有效对阵数: ${validMatches.length} （生成耗时 ${genMs}ms）`);

  const searchSpace = calculateSearchSpace(validMatches.length, numMatches, playerList.length);
  console.log(`  搜索空间估计: ${searchSpace.toExponential(3)}`);
  console.log(`  原始回溯搜索空间上限(1e6): ${searchSpace > 1_000_000 ? '⚠️ 超出，将跳过搜索' : '✅ 在上限内'}`);
  console.log('');

  // 多轮运行取平均，提升数据可信度
  const RUNS = 3;
  const resultsA = [], resultsB = [];

  for (let r = 1; r <= RUNS; r++) {
    console.log(`── 第 ${r}/${RUNS} 轮 ─────────────────────────────────────`);

    process.stdout.write('  运行原始回溯法... ');
    const mA = selectBalancedMatchesBackTrace(validMatches, numMatches, playerList);
    resultsA.push(mA);
    console.log(mA.searchSpaceSkip ? `跳过（搜索空间过大）` : `${mA.wallTimeMs}ms [${mA.result}]`);

    process.stdout.write('  运行MRV回溯法...  ');
    const mB = selectBalancedMatchesBackTraceMRV(validMatches, numMatches, playerList);
    resultsB.push(mB);
    console.log(`${mB.wallTimeMs}ms [${mB.result}]`);
  }

  console.log('');

  // 汇总
  const avg = (arr, key) => arr.reduce((s, m) => s + (m[key] || 0), 0) / arr.length;
  const best = (arr, key) => Math.min(...arr.map(m => m[key] || Infinity));
  const worst = (arr, key) => Math.max(...arr.map(m => m[key] || 0));

  const mA0 = resultsA[0];
  const mB0 = resultsB[0];

  console.log('═══════════════════════════════════════════════════════');
  console.log('  综合指标对比');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const col = (v, w = 22) => String(v).padStart(w);

  // Header
  console.log(`${'指标'.padEnd(28)}${col('原始回溯法')}${col('MRV回溯法')}`);
  console.log('─'.repeat(74));

  const rowA = (label, aVal, bVal, unit = '') => {
    const aStr = aVal === null ? '（跳过）' : `${aVal}${unit}`;
    const bStr = bVal === null ? '（跳过）' : `${bVal}${unit}`;
    console.log(`${label.padEnd(28)}${col(aStr)}${col(bStr)}`);
  };

  rowA('执行结果', mA0.result, mB0.result);
  rowA('平均耗时', mA0.searchSpaceSkip ? null : avg(resultsA, 'wallTimeMs').toFixed(1), avg(resultsB, 'wallTimeMs').toFixed(1), ' ms');
  rowA('最快耗时', mA0.searchSpaceSkip ? null : best(resultsA, 'wallTimeMs'), best(resultsB, 'wallTimeMs'), ' ms');
  rowA('最慢耗时', mA0.searchSpaceSkip ? null : worst(resultsA, 'wallTimeMs'), worst(resultsB, 'wallTimeMs'), ' ms');
  rowA('递归调用次数', mA0.searchSpaceSkip ? null : avg(resultsA, 'recursiveCalls').toFixed(0), avg(resultsB, 'recursiveCalls').toFixed(0));
  rowA('最大搜索深度', mA0.searchSpaceSkip ? null : avg(resultsA, 'maxDepthReached').toFixed(0), avg(resultsB, 'maxDepthReached').toFixed(0));

  // 算法A专属
  console.log('');
  console.log('  [原始回溯法 专属指标]');
  if (mA0.searchSpaceSkip) {
    console.log('    搜索空间检查: 超出阈值(1e6)，直接放弃搜索，返回null');
  } else {
    console.log(`    溢出剪枝次数: ${avg(resultsA, 'prunesByOverflow').toFixed(0)}`);
    console.log(`    不可达剪枝次数: ${avg(resultsA, 'prunesByReach').toFixed(0)}`);
    console.log(`    实际扩展节点数: ${avg(resultsA, 'nodesExplored').toFixed(0)}`);
  }

  // 算法B专属
  console.log('');
  console.log('  [MRV回溯法 专属指标]');
  console.log(`    可行性剪枝次数: ${avg(resultsB, 'feasibilityPrunes').toFixed(0)}`);
  console.log(`    子节点排序次数: ${avg(resultsB, 'candidatesSorted').toFixed(0)}`);
  console.log(`    超时: ${mB0.timedOut ? '是' : '否'}`);

  // 效率比较
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  结论');
  console.log('═══════════════════════════════════════════════════════');

  if (mA0.searchSpaceSkip && mB0.result === 'SUCCESS') {
    console.log('');
    console.log('  ✅ MRV回溯法 成功找到解，而原始回溯法因搜索空间估算');
    console.log(`     超出阈值 (${searchSpace.toExponential(2)} > 1e6) 直接放弃。`);
    console.log('');
    console.log('  关键差异：');
    console.log('  1. 搜索空间估算：原始回溯法对搜索空间过于悲观，导致大量');
    console.log('     本可解决的问题被跳过；MRV无此限制。');
    console.log('  2. 变量选择策略：MRV优先处理"最受约束"的选手（出场需求');
    console.log('     最大且可用对阵最少），大幅缩减实际搜索树。');
    console.log('  3. 供应量剪枝：MRV实时维护 supply[] 数组，在供应不足时');
    console.log('     立即剪枝，避免深入无解分支；原始回溯依赖 canReachTarget');
    console.log('     的全局估算，精度更低。');
    console.log('  4. 状态存储：MRV用 in-place 数组避免每层对象拷贝，');
    console.log('     内存开销更小，缓存友好。');
  } else if (mA0.result === 'SUCCESS' && mB0.result === 'SUCCESS') {
    const speedup = avg(resultsA, 'wallTimeMs') / avg(resultsB, 'wallTimeMs');
    const callRatio = avg(resultsA, 'recursiveCalls') / avg(resultsB, 'recursiveCalls');
    console.log(`  ✅ 两种方法都找到了解`);
    console.log(`  MRV耗时是原始回溯法的 ${(1/speedup).toFixed(2)}x（${speedup > 1 ? 'MRV更快' : 'MRV更慢'}）`);
    console.log(`  MRV递归调用次数是原始回溯法的 ${(1/callRatio).toFixed(2)}x`);
  } else {
    console.log(`  原始回溯法结果: ${mA0.result}`);
    console.log(`  MRV回溯法结果: ${mB0.result}`);
  }
  console.log('');

  // 打印对阵结果
  printMatchResult('原始回溯法', mA0);
  printMatchResult('MRV回溯法', mB0);
}

function printMatchResult(label, metrics) {
  console.log('');
  console.log(`═══════════════════════════════════════════════════════`);
  console.log(`  ${label} - 对阵结果`);
  console.log(`═══════════════════════════════════════════════════════`);

  if (!metrics.matches) {
    console.log('  （无结果）');
    return;
  }

  metrics.matches.forEach((m, idx) => {
    const l1 = (m.level1 !== undefined ? m.level1 : '?');
    const l2 = (m.level2 !== undefined ? m.level2 : '?');
    const diff = (m.levelDiff !== undefined ? m.levelDiff : '?');
    console.log(`  第${String(idx + 1).padStart(2)}场: (${m.pair1[0]}+${m.pair1[1]}) [${l1}] vs (${m.pair2[0]}+${m.pair2[1]}) [${l2}]  差=${diff}`);
  });

  console.log('');
  console.log('  选手出场统计:');
  const entries = Object.entries(metrics.playerCounts);
  const row = entries.map(([p, c]) => `${p}:${c}`).join('  ');
  console.log(`  ${row}`);
}

runBenchmark();
